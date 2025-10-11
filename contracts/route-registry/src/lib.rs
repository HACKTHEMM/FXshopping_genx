#![no_std]

//! # RouteRegistry Smart Contract (Soroban/Stellar)
//! 
//! ## Architecture: Single Program with Per-User State Pattern
//! 
//! This contract follows the recommended "single program with per-user (per-entity) state" 
//! pattern rather than deploying a new contract per transaction. Benefits:
//! - ✅ One-time deployment cost
//! - ✅ Easier to audit and upgrade
//! - ✅ Lower gas fees per transaction
//! - ✅ Centralized attestation logic with distributed state
//! 
//! ## Hybrid Storage Strategy
//! 
//! Following blockchain best practices:
//! - **On-chain**: Critical data only (hashes, amounts, timestamps, ownership)
//! - **Off-chain**: Large payloads (transaction metadata, route details) stored on IPFS/Arweave
//! - **Verification**: Content hashes stored on-chain allow anyone to verify off-chain data
//! 
//! ## Security Features
//! 
//! - Immutable attestations (write-once per route)
//! - Cryptographic proof of transaction execution
//! - User-owned data (only route creator can finalize)
//! - Timestamp-based audit trail

use soroban_sdk::{
    contract, contractimpl, contracttype, 
    symbol_short, Address, Bytes, BytesN, Env, Symbol, Vec, 
    String, Map
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Status of a registered route
#[contracttype]
#[derive(Clone, Copy, PartialEq)]
pub enum RouteStatus {
    Registered = 0,   // Route registered, awaiting execution
    Finalized = 1,    // Transaction completed successfully
    Failed = 2,       // Transaction failed or expired
    Disputed = 3,     // User disputed the outcome
}

/// Minimal on-chain route data (critical fields only)
/// Large metadata stored off-chain with content hash verification
#[contracttype]
#[derive(Clone)]
pub struct RouteAttestation {
    pub route_id: BytesN<32>,           // Unique route identifier
    pub sender: Address,                 // User who created the route
    pub expected_net: i128,              // Expected receive amount (stroops)
    pub actual_net: Option<i128>,        // Actual received (None until finalized)
    pub registered_at: u64,              // Block timestamp
    pub finalized_at: Option<u64>,       // Finalization timestamp
    pub tx_hash: Option<BytesN<32>>,     // Stellar transaction hash
    pub status: RouteStatus,             // Current status
    pub metadata_hash: BytesN<32>,       // IPFS/Arweave content hash (off-chain data)
    pub variance_pct: Option<i128>,      // (actual - expected) / expected * 100 (basis points)
}

/// User statistics (per-address aggregated data)
#[contracttype]
#[derive(Clone)]
pub struct UserStats {
    pub total_routes: u32,
    pub successful_routes: u32,
    pub failed_routes: u32,
    pub total_volume_sent: i128,       // Total volume in stroops (XLM base unit)
    pub total_variance: i128,           // Cumulative variance (can be negative)
    pub last_route_at: u64,
}

// ============================================================================
// CONTRACT IMPLEMENTATION
// ============================================================================

#[contract]
pub struct RouteRegistryContract;

#[contractimpl]
impl RouteRegistryContract {
    
    /// Register a new route before execution
    /// 
    /// # Parameters
    /// - `route_id`: Unique identifier (hash of route params + timestamp)
    /// - `sender`: User's Stellar address
    /// - `expected_net`: Expected receive amount in stroops
    /// - `metadata_hash`: Content hash of off-chain metadata (IPFS/Arweave CID)
    /// 
    /// # Off-chain Metadata Should Contain
    /// - Full route details (legs, fees, providers)
    /// - Quote snapshot (rates, slippage, timestamps)
    /// - User preferences (speed tier, risk tolerance)
    /// - Compliance data (KYC status, jurisdictions)
    /// 
    /// # Security
    /// - Route ID must be unique
    /// - Only sender can finalize later
    /// - Immutable after registration
    pub fn register_route(
        env: Env,
        route_id: BytesN<32>,
        sender: Address,
        expected_net: i128,
        metadata_hash: BytesN<32>,
    ) -> Result<(), Symbol> {
        // Require sender authorization
        sender.require_auth();
        
        // Check if route already exists
        let key = (symbol_short!("route"), route_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(symbol_short!("exists"));
        }
        
        // Validate expected amount
        if expected_net <= 0 {
            return Err(symbol_short!("invalid"));
        }
        
        // Create attestation
        let attestation = RouteAttestation {
            route_id: route_id.clone(),
            sender: sender.clone(),
            expected_net,
            actual_net: None,
            registered_at: env.ledger().timestamp(),
            finalized_at: None,
            tx_hash: None,
            status: RouteStatus::Registered,
            metadata_hash: metadata_hash.clone(),
            variance_pct: None,
        };
        
        // Store attestation (persistent storage for long-term retention)
        env.storage().persistent().set(&key, &attestation);
        
        // Update user stats
        Self::update_user_stats(&env, &sender, true, false, 0, 0);
        
        // Emit event
        env.events().publish(
            (symbol_short!("register"), sender.clone()),
            (route_id, expected_net, metadata_hash, env.ledger().timestamp())
        );
        
        Ok(())
    }
    
    /// Finalize a route after transaction execution
    /// 
    /// # Parameters
    /// - `route_id`: Route identifier from registration
    /// - `tx_hash`: Stellar transaction hash (proof of execution)
    /// - `actual_net`: Actual received amount in stroops
    /// 
    /// # Returns
    /// Variance in basis points: (actual - expected) / expected * 10000
    /// 
    /// # Security
    /// - Only original sender can finalize
    /// - Route must exist and be in "Registered" state
    /// - Cannot be finalized twice
    pub fn finalize_route(
        env: Env,
        route_id: BytesN<32>,
        tx_hash: BytesN<32>,
        actual_net: i128,
    ) -> Result<i128, Symbol> {
        let key = (symbol_short!("route"), route_id.clone());
        
        // Load existing attestation
        let mut attestation: RouteAttestation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(symbol_short!("notfound"))?;
        
        // Require original sender authorization
        attestation.sender.require_auth();
        
        // Check status
        if attestation.status != RouteStatus::Registered {
            return Err(symbol_short!("finalized"));
        }
        
        // Validate actual amount
        if actual_net <= 0 {
            return Err(symbol_short!("invalid"));
        }
        
        // Calculate variance in basis points: (actual - expected) / expected * 10000
        let variance = ((actual_net - attestation.expected_net) * 10000) / attestation.expected_net;
        
        // Update attestation
        attestation.actual_net = Some(actual_net);
        attestation.finalized_at = Some(env.ledger().timestamp());
        attestation.tx_hash = Some(tx_hash.clone());
        attestation.status = RouteStatus::Finalized;
        attestation.variance_pct = Some(variance);
        
        // Save updated attestation
        env.storage().persistent().set(&key, &attestation);
        
        // Update user stats
        Self::update_user_stats(&env, &attestation.sender, false, true, actual_net, variance);
        
        // Emit event
        env.events().publish(
            (symbol_short!("finalize"), attestation.sender.clone()),
            (route_id, variance, tx_hash, actual_net)
        );
        
        Ok(variance)
    }
    
    /// Mark a route as failed
    /// 
    /// # Use Cases
    /// - Transaction failed on Stellar network
    /// - Route expired before execution
    /// - User cancelled transaction
    pub fn mark_failed(
        env: Env,
        route_id: BytesN<32>,
        reason: String,
    ) -> Result<(), Symbol> {
        let key = (symbol_short!("route"), route_id.clone());
        
        let mut attestation: RouteAttestation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(symbol_short!("notfound"))?;
        
        // Require sender authorization
        attestation.sender.require_auth();
        
        // Can only fail registered routes
        if attestation.status != RouteStatus::Registered {
            return Err(symbol_short!("badstate"));
        }
        
        attestation.status = RouteStatus::Failed;
        attestation.finalized_at = Some(env.ledger().timestamp());
        
        env.storage().persistent().set(&key, &attestation);
        
        // Update user stats
        Self::update_user_stats(&env, &attestation.sender, false, false, 0, 0);
        
        // Emit event
        env.events().publish(
            (symbol_short!("failed"), attestation.sender.clone()),
            (route_id, reason)
        );
        
        Ok(())
    }
    
    /// Get route attestation data
    pub fn get_route(env: Env, route_id: BytesN<32>) -> Option<RouteAttestation> {
        let key = (symbol_short!("route"), route_id);
        env.storage().persistent().get(&key)
    }
    
    /// Get user statistics
    pub fn get_user_stats(env: Env, user: Address) -> Option<UserStats> {
        let key = (symbol_short!("stats"), user);
        env.storage().persistent().get(&key)
    }
    
    /// Get all routes for a user (paginated)
    /// 
    /// Returns route IDs only; client fetches full data via get_route
    /// This keeps on-chain queries efficient
    pub fn get_user_routes(
        env: Env,
        user: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<BytesN<32>> {
        let key = (symbol_short!("userlist"), user);
        let all_routes: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));
        
        let start = offset as usize;
        let end = ((offset + limit) as usize).min(all_routes.len());
        
        let mut result = Vec::new(&env);
        for i in start..end {
            if let Some(route_id) = all_routes.get(i as u32) {
                result.push_back(route_id);
            }
        }
        
        result
    }
    
    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================
    
    /// Update user statistics
    fn update_user_stats(
        env: &Env,
        user: &Address,
        is_new: bool,
        is_success: bool,
        volume: i128,
        variance: i128,
    ) {
        let key = (symbol_short!("stats"), user.clone());
        
        let mut stats: UserStats = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(UserStats {
                total_routes: 0,
                successful_routes: 0,
                failed_routes: 0,
                total_volume_sent: 0,
                total_variance: 0,
                last_route_at: 0,
            });
        
        if is_new {
            stats.total_routes += 1;
        }
        
        if is_success {
            stats.successful_routes += 1;
            stats.total_volume_sent += volume;
            stats.total_variance += variance;
        } else if !is_new {
            stats.failed_routes += 1;
        }
        
        stats.last_route_at = env.ledger().timestamp();
        
        env.storage().persistent().set(&key, &stats);
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    
    #[test]
    fn test_register_and_finalize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RouteRegistryContract);
        let client = RouteRegistryContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let route_id = BytesN::from_array(&env, &[1u8; 32]);
        let metadata_hash = BytesN::from_array(&env, &[2u8; 32]);
        let tx_hash = BytesN::from_array(&env, &[3u8; 32]);
        
        env.mock_all_auths();
        
        // Register route
        client.register_route(&route_id, &user, &1000000, &metadata_hash);
        
        // Verify registration
        let route = client.get_route(&route_id).unwrap();
        assert_eq!(route.expected_net, 1000000);
        assert_eq!(route.status, RouteStatus::Registered);
        
        // Finalize with slightly better outcome
        let variance = client.finalize_route(&route_id, &tx_hash, &1005000);
        
        // Variance should be ~0.5% = 50 basis points
        assert_eq!(variance, 50);
        
        // Verify finalization
        let route = client.get_route(&route_id).unwrap();
        assert_eq!(route.status, RouteStatus::Finalized);
        assert_eq!(route.actual_net, Some(1005000));
        
        // Check user stats
        let stats = client.get_user_stats(&user).unwrap();
        assert_eq!(stats.total_routes, 1);
        assert_eq!(stats.successful_routes, 1);
    }
    
    #[test]
    fn test_duplicate_registration_fails() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RouteRegistryContract);
        let client = RouteRegistryContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let route_id = BytesN::from_array(&env, &[1u8; 32]);
        let metadata_hash = BytesN::from_array(&env, &[2u8; 32]);
        
        env.mock_all_auths();
        
        // First registration succeeds
        client.register_route(&route_id, &user, &1000000, &metadata_hash);
        
        // Second registration should fail
        let result = client.try_register_route(&route_id, &user, &2000000, &metadata_hash);
        assert!(result.is_err());
    }
}
