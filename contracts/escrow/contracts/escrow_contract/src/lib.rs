#![no_std]

//! # Escrow Smart Contract
//!
//! A Soroban smart contract for secure multi-party escrow transactions.
//!
//! ## Features
//! - Create escrow deposits with timelock
//! - Release funds to recipient
//! - Refund to sender after timeout
//! - Multi-party approval mechanism
//! - Dispute resolution support

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env,
    token, log
};

/// Errors that can occur in the Escrow contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Escrow not found
    EscrowNotFound = 1,
    /// Escrow already released
    AlreadyReleased = 2,
    /// Escrow already refunded
    AlreadyRefunded = 3,
    /// Timeout not reached yet
    TimeoutNotReached = 4,
    /// Caller not authorized
    Unauthorized = 5,
    /// Invalid amount
    InvalidAmount = 6,
    /// Escrow expired
    Expired = 7,
}

/// Asset identifier
pub type Asset = Address;

/// Escrow status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowStatus {
    Pending = 0,
    Released = 1,
    Refunded = 2,
    Disputed = 3,
}

/// Escrow data structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowData {
    /// Sender (depositor)
    pub sender: Address,
    /// Recipient (beneficiary)
    pub recipient: Address,
    /// Asset being escrowed
    pub asset: Asset,
    /// Amount in escrow
    pub amount: i128,
    /// Timeout timestamp (ledger close time)
    pub timeout: u64,
    /// Creation timestamp
    pub created_at: u64,
    /// Current status
    pub status: EscrowStatus,
    /// Optional arbiter for disputes
    pub arbiter: Option<Address>,
}

/// Storage keys
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Next escrow ID counter
    NextEscrowId,
    /// Escrow data by ID
    Escrow(u64),
    /// Admin address
    Admin,
}

/// Escrow Contract
#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Initialize the contract with admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextEscrowId, &0u64);

        log!(&env, "Escrow contract initialized");
    }

    /// Create a new escrow deposit
    ///
    /// # Arguments
    /// * `sender` - Address depositing funds
    /// * `asset` - Asset to escrow
    /// * `amount` - Amount to escrow
    /// * `recipient` - Address to receive funds
    /// * `timeout_seconds` - Timeout duration in seconds
    /// * `arbiter` - Optional arbiter for disputes
    ///
    /// # Returns
    /// Escrow ID
    pub fn deposit(
        env: Env,
        sender: Address,
        asset: Asset,
        amount: i128,
        recipient: Address,
        timeout_seconds: u64,
        arbiter: Option<Address>,
    ) -> Result<u64, Error> {
        sender.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        // Get next escrow ID
        let escrow_id: u64 = env.storage()
            .instance()
            .get(&DataKey::NextEscrowId)
            .unwrap_or(0);

        // Calculate timeout (current ledger time + timeout_seconds)
        let current_time = env.ledger().timestamp();
        let timeout = current_time + timeout_seconds;

        // Create escrow data
        let escrow = EscrowData {
            sender: sender.clone(),
            recipient,
            asset: asset.clone(),
            amount,
            timeout,
            created_at: current_time,
            status: EscrowStatus::Pending,
            arbiter,
        };

        // Transfer tokens from sender to contract
        let token_client = token::TokenClient::new(&env, &asset);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        // Store escrow
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);

        // Increment counter
        env.storage().instance().set(&DataKey::NextEscrowId, &(escrow_id + 1));

        log!(&env, "Escrow {} created: {} tokens", escrow_id, amount);

        Ok(escrow_id)
    }

    /// Release escrowed funds to recipient
    ///
    /// Can be called by sender or arbiter
    pub fn release(env: Env, escrow_id: u64, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: EscrowData = env.storage()
            .persistent()
            .get(&escrow_key)
            .ok_or(Error::EscrowNotFound)?;

        // Check status
        if escrow.status != EscrowStatus::Pending {
            return Err(Error::AlreadyReleased);
        }

        // Check authorization (sender or arbiter)
        let is_authorized = caller == escrow.sender
            || escrow.arbiter.as_ref() == Some(&caller);

        if !is_authorized {
            return Err(Error::Unauthorized);
        }

        // Check not expired
        let current_time = env.ledger().timestamp();
        if current_time > escrow.timeout {
            return Err(Error::Expired);
        }

        // Transfer tokens to recipient
        let token_client = token::TokenClient::new(&env, &escrow.asset);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.recipient,
            &escrow.amount,
        );

        // Update status
        escrow.status = EscrowStatus::Released;
        env.storage().persistent().set(&escrow_key, &escrow);

        log!(&env, "Escrow {} released to recipient", escrow_id);

        Ok(())
    }

    /// Refund escrowed funds to sender
    ///
    /// Can only be called after timeout
    pub fn refund(env: Env, escrow_id: u64, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: EscrowData = env.storage()
            .persistent()
            .get(&escrow_key)
            .ok_or(Error::EscrowNotFound)?;

        // Check status
        if escrow.status != EscrowStatus::Pending {
            return Err(Error::AlreadyRefunded);
        }

        // Check timeout reached
        let current_time = env.ledger().timestamp();
        if current_time < escrow.timeout {
            return Err(Error::TimeoutNotReached);
        }

        // Check authorization (sender or arbiter)
        let is_authorized = caller == escrow.sender
            || escrow.arbiter.as_ref() == Some(&caller);

        if !is_authorized {
            return Err(Error::Unauthorized);
        }

        // Transfer tokens back to sender
        let token_client = token::TokenClient::new(&env, &escrow.asset);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.sender,
            &escrow.amount,
        );

        // Update status
        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&escrow_key, &escrow);

        log!(&env, "Escrow {} refunded to sender", escrow_id);

        Ok(())
    }

    /// Extend escrow timeout
    ///
    /// Can be called by sender or recipient
    pub fn extend_timeout(
        env: Env,
        escrow_id: u64,
        caller: Address,
        additional_seconds: u64,
    ) -> Result<(), Error> {
        caller.require_auth();

        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: EscrowData = env.storage()
            .persistent()
            .get(&escrow_key)
            .ok_or(Error::EscrowNotFound)?;

        // Check status
        if escrow.status != EscrowStatus::Pending {
            return Err(Error::AlreadyReleased);
        }

        // Check authorization (sender or recipient)
        let is_authorized = caller == escrow.sender || caller == escrow.recipient;

        if !is_authorized {
            return Err(Error::Unauthorized);
        }

        // Extend timeout
        escrow.timeout += additional_seconds;
        env.storage().persistent().set(&escrow_key, &escrow);

        log!(&env, "Escrow {} timeout extended by {} seconds", escrow_id, additional_seconds);

        Ok(())
    }

    /// Mark escrow as disputed
    ///
    /// Can be called by sender or recipient
    pub fn dispute(env: Env, escrow_id: u64, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: EscrowData = env.storage()
            .persistent()
            .get(&escrow_key)
            .ok_or(Error::EscrowNotFound)?;

        // Check status
        if escrow.status != EscrowStatus::Pending {
            return Err(Error::AlreadyReleased);
        }

        // Check authorization (sender or recipient)
        let is_authorized = caller == escrow.sender || caller == escrow.recipient;

        if !is_authorized {
            return Err(Error::Unauthorized);
        }

        // Mark as disputed
        escrow.status = EscrowStatus::Disputed;
        env.storage().persistent().set(&escrow_key, &escrow);

        log!(&env, "Escrow {} marked as disputed", escrow_id);

        Ok(())
    }

    /// Get escrow data (read-only)
    pub fn get_escrow(env: Env, escrow_id: u64) -> Result<EscrowData, Error> {
        let escrow_key = DataKey::Escrow(escrow_id);
        env.storage()
            .persistent()
            .get(&escrow_key)
            .ok_or(Error::EscrowNotFound)
    }

    /// Get total number of escrows created
    pub fn get_escrow_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextEscrowId)
            .unwrap_or(0)
    }
}

mod test;
