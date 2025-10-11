#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short, 
    Address, BytesN, Env, Symbol, Map, log
};

/// Route data stored for each registered route
#[contracttype]
#[derive(Clone)]
pub struct RouteData {
    pub expected_net: i128,
    pub actual_net: Option<i128>,
    pub sender: Address,
    pub registered_at: u64,
    pub finalized_at: Option<u64>,
    pub tx_hash: Option<BytesN<32>>,
    pub status: Symbol, // "registered", "finalized", "failed"
    pub variance: Option<i128>, // actual - expected
}

/// Contract errors
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    RouteNotFound = 1,
    RouteAlreadyFinalized = 2,
    UnauthorizedSender = 3,
    InvalidStatus = 4,
}

const ROUTES: Symbol = symbol_short!("ROUTES");
const STATUS_REG: Symbol = symbol_short!("reg");
const STATUS_FIN: Symbol = symbol_short!("fin");
const STATUS_FAIL: Symbol = symbol_short!("fail");

#[contract]
pub struct RouteRegistryContract;

#[contractimpl]
impl RouteRegistryContract {
    /// Register a new route before execution
    /// 
    /// # Arguments
    /// * `route_id` - Unique identifier for the route (hash of route parameters)
    /// * `expected_net` - Expected net receive amount in stroops
    /// * `sender` - User's Stellar address initiating the route
    /// 
    /// # Returns
    /// * `Result<(), Error>` - Success or error
    pub fn register_route(
        env: Env,
        route_id: BytesN<32>,
        expected_net: i128,
        sender: Address,
    ) -> Result<(), Error> {
        // Require sender authorization
        sender.require_auth();

        let mut routes: Map<BytesN<32>, RouteData> = env
            .storage()
            .instance()
            .get(&ROUTES)
            .unwrap_or(Map::new(&env));

        // Check if route already exists
        if routes.contains_key(route_id.clone()) {
            return Err(Error::RouteAlreadyFinalized);
        }

        let route_data = RouteData {
            expected_net,
            actual_net: None,
            sender: sender.clone(),
            registered_at: env.ledger().timestamp(),
            finalized_at: None,
            tx_hash: None,
            status: STATUS_REG,
            variance: None,
        };

        routes.set(route_id.clone(), route_data);
        env.storage().instance().set(&ROUTES, &routes);

        // Emit event
        env.events().publish(
            (symbol_short!("reg"), route_id.clone()),
            (expected_net, sender.clone(), env.ledger().timestamp())
        );

        log!(&env, "Route registered: {:?} for sender: {:?}", route_id, sender);

        Ok(())
    }

    /// Finalize a route after transaction execution
    /// 
    /// # Arguments
    /// * `route_id` - Route identifier from registration
    /// * `tx_hash` - Stellar transaction hash of executed payment
    /// * `actual_net` - Actual amount received in stroops
    /// 
    /// # Returns
    /// * `Result<i128, Error>` - Returns variance (actual - expected) or error
    pub fn finalize_route(
        env: Env,
        route_id: BytesN<32>,
        tx_hash: BytesN<32>,
        actual_net: i128,
    ) -> Result<i128, Error> {
        let mut routes: Map<BytesN<32>, RouteData> = env
            .storage()
            .instance()
            .get(&ROUTES)
            .unwrap_or(Map::new(&env));

        let mut route_data = routes.get(route_id.clone()).ok_or(Error::RouteNotFound)?;

        // Require original sender authorization
        route_data.sender.require_auth();

        // Check if already finalized
        if route_data.status == STATUS_FIN || route_data.status == STATUS_FAIL {
            return Err(Error::RouteAlreadyFinalized);
        }

        // Calculate variance
        let variance = actual_net - route_data.expected_net;

        // Update route data
        route_data.actual_net = Some(actual_net);
        route_data.finalized_at = Some(env.ledger().timestamp());
        route_data.tx_hash = Some(tx_hash.clone());
        route_data.status = STATUS_FIN;
        route_data.variance = Some(variance);

        routes.set(route_id.clone(), route_data);
        env.storage().instance().set(&ROUTES, &routes);

        // Emit finalization event
        env.events().publish(
            (symbol_short!("fin"), route_id.clone()),
            (variance, tx_hash.clone(), env.ledger().timestamp())
        );

        log!(&env, "Route finalized: {:?}, variance: {}", route_id, variance);

        Ok(variance)
    }

    /// Mark a route as failed
    /// 
    /// # Arguments
    /// * `route_id` - Route identifier from registration
    /// * `failure_reason` - Symbol describing the failure reason
    /// 
    /// # Returns
    /// * `Result<(), Error>` - Success or error
    pub fn fail_route(
        env: Env,
        route_id: BytesN<32>,
        failure_reason: Symbol,
    ) -> Result<(), Error> {
        let mut routes: Map<BytesN<32>, RouteData> = env
            .storage()
            .instance()
            .get(&ROUTES)
            .unwrap_or(Map::new(&env));

        let mut route_data = routes.get(route_id.clone()).ok_or(Error::RouteNotFound)?;

        // Require original sender authorization
        route_data.sender.require_auth();

        // Check if already finalized
        if route_data.status == STATUS_FIN || route_data.status == STATUS_FAIL {
            return Err(Error::RouteAlreadyFinalized);
        }

        // Update route data as failed
        route_data.finalized_at = Some(env.ledger().timestamp());
        route_data.status = STATUS_FAIL;

        routes.set(route_id.clone(), route_data);
        env.storage().instance().set(&ROUTES, &routes);

        // Emit failure event
        env.events().publish(
            (symbol_short!("fail"), route_id.clone()),
            (failure_reason.clone(), env.ledger().timestamp())
        );

        log!(&env, "Route failed: {:?}, reason: {:?}", route_id, failure_reason);

        Ok(())
    }

    /// Get route data by ID
    /// 
    /// # Arguments
    /// * `route_id` - Route identifier to query
    /// 
    /// # Returns
    /// * `Option<RouteData>` - Route data if found, None otherwise
    pub fn get_route(env: Env, route_id: BytesN<32>) -> Option<RouteData> {
        let routes: Map<BytesN<32>, RouteData> = env
            .storage()
            .instance()
            .get(&ROUTES)
            .unwrap_or(Map::new(&env));

        routes.get(route_id)
    }

    /// Get all routes for a specific sender
    /// 
    /// # Arguments
    /// * `sender` - Address to get routes for
    /// 
    /// # Returns
    /// * `Map<BytesN<32>, RouteData>` - Map of route IDs to route data
    pub fn get_routes_for_sender(env: Env, sender: Address) -> Map<BytesN<32>, RouteData> {
        let routes: Map<BytesN<32>, RouteData> = env
            .storage()
            .instance()
            .get(&ROUTES)
            .unwrap_or(Map::new(&env));

        let mut sender_routes = Map::new(&env);
        
        for (route_id, route_data) in routes.iter() {
            if route_data.sender == sender {
                sender_routes.set(route_id, route_data);
            }
        }

        sender_routes
    }

    /// Get route statistics
    /// 
    /// # Returns
    /// * `(u32, u32, u32)` - (total_routes, finalized_routes, failed_routes)
    pub fn get_stats(env: Env) -> (u32, u32, u32) {
        let routes: Map<BytesN<32>, RouteData> = env
            .storage()
            .instance()
            .get(&ROUTES)
            .unwrap_or(Map::new(&env));

        let mut total = 0u32;
        let mut finalized = 0u32;
        let mut failed = 0u32;

        for (_, route_data) in routes.iter() {
            total += 1;
            if route_data.status == STATUS_FIN {
                finalized += 1;
            } else if route_data.status == STATUS_FAIL {
                failed += 1;
            }
        }

        (total, finalized, failed)
    }
}

// Tests module
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_register_and_finalize_route() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RouteRegistryContract);
        let client = RouteRegistryContractClient::new(&env, &contract_id);

        let sender = Address::generate(&env);
        let route_id = BytesN::from_array(&env, &[0; 32]);
        let tx_hash = BytesN::from_array(&env, &[1; 32]);
        let expected_net = 1000i128;
        let actual_net = 995i128;

        // Register route
        client
            .mock_auths(&[MockAuth {
                address: &sender,
                invoke: &MockAuthInvoke {
                    contract: &contract_id,
                    fn_name: "register_route",
                    args: (route_id.clone(), expected_net, sender.clone()).into_val(&env),
                    sub_invokes: &[],
                },
            }])
            .register_route(&route_id, &expected_net, &sender);

        // Check route exists
        let route_data = client.get_route(&route_id).unwrap();
        assert_eq!(route_data.expected_net, expected_net);
        assert_eq!(route_data.sender, sender);
        assert_eq!(route_data.status, STATUS_REG);

        // Finalize route
        let variance = client
            .mock_auths(&[MockAuth {
                address: &sender,
                invoke: &MockAuthInvoke {
                    contract: &contract_id,
                    fn_name: "finalize_route",
                    args: (route_id.clone(), tx_hash.clone(), actual_net).into_val(&env),
                    sub_invokes: &[],
                },
            }])
            .finalize_route(&route_id, &tx_hash, &actual_net);

        assert_eq!(variance, actual_net - expected_net);

        // Check finalized route
        let finalized_route = client.get_route(&route_id).unwrap();
        assert_eq!(finalized_route.status, STATUS_FIN);
        assert_eq!(finalized_route.actual_net, Some(actual_net));
        assert_eq!(finalized_route.variance, Some(variance));
        assert_eq!(finalized_route.tx_hash, Some(tx_hash));
    }

    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
}