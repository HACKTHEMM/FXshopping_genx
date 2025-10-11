#![no_std]

//! # Router Smart Contract
//!
//! A Soroban smart contract for intelligent routing through multiple liquidity sources.
//!
//! ## Features
//! - Find optimal swap paths across multiple exchanges
//! - Multi-hop routing for best rates
//! - Exchange registry management
//! - Path caching for efficiency
//! - Support for aggregating liquidity

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, Vec,
    log
};

/// Errors that can occur in the Router contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// No path found between assets
    NoPathFound = 1,
    /// Exchange not registered
    ExchangeNotRegistered = 2,
    /// Invalid path
    InvalidPath = 3,
    /// Caller not authorized
    Unauthorized = 4,
    /// Insufficient output amount
    InsufficientOutput = 5,
    /// Too many hops in path
    TooManyHops = 6,
}

/// Asset identifier
pub type Asset = Address;

/// Exchange (contract address)
pub type Exchange = Address;

/// Swap hop in a path
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Hop {
    /// Exchange to use for this hop
    pub exchange: Exchange,
    /// Input asset for this hop
    pub from_asset: Asset,
    /// Output asset for this hop
    pub to_asset: Asset,
}

/// Complete swap path
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Path {
    /// Sequence of hops
    pub hops: Vec<Hop>,
    /// Expected output amount
    pub expected_output: i128,
    /// Estimated fee total
    pub total_fee: i128,
}

/// Quote result from router
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RouteQuote {
    /// Best path found
    pub path: Path,
    /// Input amount
    pub amount_in: i128,
    /// Expected output amount
    pub amount_out: i128,
    /// Price impact (basis points)
    pub price_impact_bps: i128,
}

/// Storage keys
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Admin address
    Admin,
    /// List of registered exchanges
    Exchanges,
    /// Cached path for asset pair
    CachedPath(Asset, Asset),
    /// Maximum hops allowed
    MaxHops,
}

/// Router Contract
#[contract]
pub struct RouterContract;

#[contractimpl]
impl RouterContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address, max_hops: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::MaxHops, &max_hops);
        env.storage().instance().set(&DataKey::Exchanges, &Vec::<Exchange>::new(&env));

        log!(&env, "Router contract initialized with max hops: {}", max_hops);
    }

    /// Register a new exchange
    ///
    /// Admin only
    pub fn register_exchange(
        env: Env,
        caller: Address,
        exchange: Exchange,
    ) -> Result<(), Error> {
        caller.require_auth();

        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();

        if caller != admin {
            return Err(Error::Unauthorized);
        }

        let mut exchanges: Vec<Exchange> = env.storage()
            .instance()
            .get(&DataKey::Exchanges)
            .unwrap_or(Vec::new(&env));

        // Add if not already present
        if !exchanges.contains(&exchange) {
            exchanges.push_back(exchange.clone());
            env.storage().instance().set(&DataKey::Exchanges, &exchanges);
            log!(&env, "Exchange registered");
        }

        Ok(())
    }

    /// Unregister an exchange
    ///
    /// Admin only
    pub fn unregister_exchange(
        env: Env,
        caller: Address,
        exchange: Exchange,
    ) -> Result<(), Error> {
        caller.require_auth();

        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();

        if caller != admin {
            return Err(Error::Unauthorized);
        }

        let exchanges: Vec<Exchange> = env.storage()
            .instance()
            .get(&DataKey::Exchanges)
            .unwrap_or(Vec::new(&env));

        // Remove exchange
        let mut new_exchanges = Vec::new(&env);
        for e in exchanges.iter() {
            if e != exchange {
                new_exchanges.push_back(e);
            }
        }

        env.storage().instance().set(&DataKey::Exchanges, &new_exchanges);
        log!(&env, "Exchange unregistered");

        Ok(())
    }

    /// Find best path for a swap
    ///
    /// This is a simplified implementation. In production, this would:
    /// - Query all registered exchanges for quotes
    /// - Build a graph of possible routes
    /// - Use algorithms like Bellman-Ford or Dijkstra to find optimal path
    /// - Consider multi-hop routes
    pub fn find_best_path(
        env: Env,
        from_asset: Asset,
        to_asset: Asset,
        amount_in: i128,
    ) -> Result<RouteQuote, Error> {
        // Check cache first
        let cache_key = DataKey::CachedPath(from_asset.clone(), to_asset.clone());
        if let Some(cached_path) = env.storage().temporary().get::<DataKey, Path>(&cache_key) {
            log!(&env, "Using cached path");

            return Ok(RouteQuote {
                path: cached_path.clone(),
                amount_in,
                amount_out: cached_path.expected_output,
                price_impact_bps: 0, // TODO: Calculate
            });
        }

        // Get registered exchanges
        let exchanges: Vec<Exchange> = env.storage()
            .instance()
            .get(&DataKey::Exchanges)
            .ok_or(Error::ExchangeNotRegistered)?;

        if exchanges.is_empty() {
            return Err(Error::ExchangeNotRegistered);
        }

        // Simplified: Try direct swap on first exchange
        // TODO: Implement proper path-finding algorithm
        let first_exchange = exchanges.get(0).unwrap();

        // Create single-hop path
        let hop = Hop {
            exchange: first_exchange.clone(),
            from_asset: from_asset.clone(),
            to_asset: to_asset.clone(),
        };

        let mut hops = Vec::new(&env);
        hops.push_back(hop);

        // Estimate output (simplified - in production, query the exchange)
        let estimated_output = Self::estimate_output(&env, &hops, amount_in)?;
        let total_fee = amount_in / 333; // ~0.3% fee estimate

        let path = Path {
            hops,
            expected_output: estimated_output,
            total_fee,
        };

        // Cache the path (temporary storage, auto-expires)
        env.storage().temporary().set(&cache_key, &path);

        log!(&env, "Found path with {} hops", 1);

        Ok(RouteQuote {
            path,
            amount_in,
            amount_out: estimated_output,
            price_impact_bps: 10, // 0.1% - placeholder
        })
    }

    /// Execute a swap along a given path
    ///
    /// This would invoke the actual FX Exchange contracts
    pub fn execute_swap(
        env: Env,
        sender: Address,
        path: Path,
        amount_in: i128,
        min_amount_out: i128,
    ) -> Result<i128, Error> {
        sender.require_auth();

        // Validate path
        if path.hops.is_empty() {
            return Err(Error::InvalidPath);
        }

        let max_hops: u32 = env.storage()
            .instance()
            .get(&DataKey::MaxHops)
            .unwrap_or(3);

        if path.hops.len() > max_hops {
            return Err(Error::TooManyHops);
        }

        // Execute each hop
        // TODO: In production, this would call the actual exchange contracts
        let final_amount = Self::execute_hops(&env, &path.hops, amount_in)?;

        // Check slippage
        if final_amount < min_amount_out {
            return Err(Error::InsufficientOutput);
        }

        log!(&env, "Swap executed: {} -> {}", amount_in, final_amount);

        Ok(final_amount)
    }

    /// Get list of registered exchanges (read-only)
    pub fn get_exchanges(env: Env) -> Vec<Exchange> {
        env.storage()
            .instance()
            .get(&DataKey::Exchanges)
            .unwrap_or(Vec::new(&env))
    }

    /// Get max hops configuration
    pub fn get_max_hops(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::MaxHops)
            .unwrap_or(3)
    }

    /// Clear cached path (admin only)
    pub fn clear_cache(
        env: Env,
        caller: Address,
        from_asset: Asset,
        to_asset: Asset,
    ) -> Result<(), Error> {
        caller.require_auth();

        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();

        if caller != admin {
            return Err(Error::Unauthorized);
        }

        let cache_key = DataKey::CachedPath(from_asset, to_asset);
        env.storage().temporary().remove(&cache_key);

        Ok(())
    }

    // Internal helper functions

    /// Estimate output for a path
    ///
    /// In production, this would query each exchange contract
    fn estimate_output(
        _env: &Env,
        _hops: &Vec<Hop>,
        amount_in: i128,
    ) -> Result<i128, Error> {
        // Simplified: assume 0.3% fee per hop
        // In production: query actual exchange contracts
        let fee_rate = 997; // 99.7% (0.3% fee)
        let estimated = (amount_in * fee_rate) / 1000;

        Ok(estimated)
    }

    /// Execute hops sequentially
    ///
    /// In production, this would invoke exchange contracts
    fn execute_hops(
        _env: &Env,
        _hops: &Vec<Hop>,
        amount_in: i128,
    ) -> Result<i128, Error> {
        // TODO: Call actual exchange contracts for each hop
        // For now, return simulated output
        let output = (amount_in * 997) / 1000; // Simulate 0.3% fee

        Ok(output)
    }
}

mod test;
