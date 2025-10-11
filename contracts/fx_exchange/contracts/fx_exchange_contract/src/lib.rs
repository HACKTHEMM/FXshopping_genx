#![no_std]

//! # FX Exchange Contract
//!
//! A Soroban smart contract for foreign exchange swaps with slippage protection.
//!
//! ## Features
//! - Currency swaps with automatic rate calculation
//! - Slippage protection with minimum receive amounts
//! - Liquidity pool management
//! - Fee calculation and collection
//! - Emergency pause functionality

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env,
    token, log
};

/// Errors that can occur in the FX Exchange contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Insufficient liquidity in the pool
    InsufficientLiquidity = 1,
    /// Slippage exceeded - amount received less than minimum
    SlippageExceeded = 2,
    /// Invalid asset address
    InvalidAsset = 3,
    /// Invalid amount (zero or negative)
    InvalidAmount = 4,
    /// Caller not authorized for this operation
    Unauthorized = 5,
    /// Contract is paused
    ContractPaused = 6,
    /// Asset pair not supported
    UnsupportedPair = 7,
}

/// Asset identifier (contract address)
pub type Asset = Address;

/// Quote information for a swap
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Quote {
    /// Amount that will be received
    pub amount_out: i128,
    /// Exchange rate (scaled by 10^7)
    pub rate: i128,
    /// Fee amount
    pub fee: i128,
    /// Price impact percentage (scaled by 10^4, e.g. 100 = 1%)
    pub price_impact: i128,
}

/// Storage keys for contract data
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Admin address
    Admin,
    /// Paused state
    Paused,
    /// Liquidity for an asset
    Liquidity(Asset),
    /// Exchange rate for a pair (from_asset, to_asset)
    Rate(Asset, Asset),
    /// Fee in basis points (100 = 1%)
    FeeBps,
}

/// FX Exchange Contract
#[contract]
pub struct FXExchange;

#[contractimpl]
impl FXExchange {
    /// Initialize the contract with admin and initial fee
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_bps: u32,
    ) {
        // Ensure not already initialized
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage().instance().set(&DataKey::Paused, &false);

        log!(&env, "FX Exchange initialized");
    }

    /// Execute a currency swap
    ///
    /// # Arguments
    /// * `sender` - Address initiating the swap
    /// * `from_asset` - Asset to send
    /// * `to_asset` - Asset to receive
    /// * `amount` - Amount to send (in stroops)
    /// * `min_receive` - Minimum amount to receive (slippage protection)
    ///
    /// # Returns
    /// Actual amount received
    pub fn swap(
        env: Env,
        sender: Address,
        from_asset: Asset,
        to_asset: Asset,
        amount: i128,
        min_receive: i128,
    ) -> Result<i128, Error> {
        // Authentication
        sender.require_auth();

        // Check if paused
        if Self::is_paused(&env) {
            return Err(Error::ContractPaused);
        }

        // Validate inputs
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if min_receive < 0 {
            return Err(Error::InvalidAmount);
        }

        // Get quote
        let quote = Self::get_quote_internal(&env, &from_asset, &to_asset, amount)?;

        // Check slippage
        if quote.amount_out < min_receive {
            log!(&env, "Slippage exceeded: expected {}, got {}", min_receive, quote.amount_out);
            return Err(Error::SlippageExceeded);
        }

        // Transfer tokens from sender
        let from_token = token::TokenClient::new(&env, &from_asset);
        from_token.transfer(&sender, &env.current_contract_address(), &amount);

        // Transfer tokens to sender (minus fee)
        let to_token = token::TokenClient::new(&env, &to_asset);
        let amount_after_fee = quote.amount_out - quote.fee;
        to_token.transfer(&env.current_contract_address(), &sender, &amount_after_fee);

        log!(&env, "Swap executed: {} -> {}", amount, amount_after_fee);

        Ok(amount_after_fee)
    }

    /// Get a quote for a potential swap (read-only)
    pub fn get_quote(
        env: Env,
        from_asset: Asset,
        to_asset: Asset,
        amount: i128,
    ) -> Result<Quote, Error> {
        Self::get_quote_internal(&env, &from_asset, &to_asset, amount)
    }

    /// Get current exchange rate for an asset pair
    pub fn get_rate(
        env: Env,
        from_asset: Asset,
        to_asset: Asset,
    ) -> Result<i128, Error> {
        let rate_key = DataKey::Rate(from_asset.clone(), to_asset.clone());

        env.storage().persistent()
            .get(&rate_key)
            .ok_or(Error::UnsupportedPair)
    }

    /// Set exchange rate (admin only)
    pub fn set_rate(
        env: Env,
        from_asset: Asset,
        to_asset: Asset,
        rate: i128,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        let rate_key = DataKey::Rate(from_asset, to_asset);
        env.storage().persistent().set(&rate_key, &rate);

        Ok(())
    }

    /// Set liquidity for an asset (admin only)
    pub fn set_liquidity(
        env: Env,
        asset: Asset,
        amount: i128,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        if amount < 0 {
            return Err(Error::InvalidAmount);
        }

        let liquidity_key = DataKey::Liquidity(asset);
        env.storage().persistent().set(&liquidity_key, &amount);

        Ok(())
    }

    /// Pause/unpause the contract (admin only)
    pub fn set_paused(
        env: Env,
        paused: bool,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &paused);
        log!(&env, "Contract paused state: {}", paused);

        Ok(())
    }

    /// Internal helper to calculate quote
    fn get_quote_internal(
        env: &Env,
        from_asset: &Asset,
        to_asset: &Asset,
        amount: i128,
    ) -> Result<Quote, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Get exchange rate
        let rate_key = DataKey::Rate(from_asset.clone(), to_asset.clone());
        let rate: i128 = env.storage().persistent()
            .get(&rate_key)
            .ok_or(Error::UnsupportedPair)?;

        // Calculate output amount (rate is scaled by 10^7)
        let amount_out = (amount * rate) / 10_000_000;

        // Check liquidity
        let liquidity_key = DataKey::Liquidity(to_asset.clone());
        let available_liquidity: i128 = env.storage().persistent()
            .get(&liquidity_key)
            .unwrap_or(i128::MAX);

        if amount_out > available_liquidity {
            return Err(Error::InsufficientLiquidity);
        }

        // Calculate fee
        let fee_bps: u32 = env.storage().instance()
            .get(&DataKey::FeeBps)
            .unwrap_or(30); // Default 0.3%
        let fee = (amount_out * fee_bps as i128) / 10_000;

        // Calculate price impact (simplified)
        let price_impact = 0i128; // TODO: Calculate based on liquidity depth

        Ok(Quote {
            amount_out,
            rate,
            fee,
            price_impact,
        })
    }

    /// Check if contract is paused
    fn is_paused(env: &Env) -> bool {
        env.storage().instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }
}

mod test;
