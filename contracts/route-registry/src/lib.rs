#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol, String,
    Map, Vec, log,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RouteData {
    pub route_id: BytesN<32>,
    pub source_asset: String,
    pub dest_asset: String,
    pub expected_net: i128,
    pub actual_net: Option<i128>,
    pub sender: Address,
    pub recipient: Option<Address>,
    pub registered_at: u64,
    pub finalized_at: Option<u64>,
    pub tx_hash: Option<BytesN<32>>,
    pub status: Symbol, // "registered", "executing", "finalized", "failed"
    pub provider_name: String,
    pub route_legs: Vec<RouteLeg>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RouteLeg {
    pub leg_type: String, // "onchain-path", "offchain-quote", "anchor-deposit", etc.
    pub from_asset: String,
    pub to_asset: String,
    pub rate: i128, // Fixed-point rate (multiply by 10^7 for precision)
    pub est_seconds: u32,
    pub provider: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CurrencyPair {
    pub source: String,
    pub destination: String,
    pub rate: i128,
    pub last_updated: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionResult {
    pub route_id: BytesN<32>,
    pub success: bool,
    pub actual_received: i128,
    pub variance: i128, // actual - expected
    pub execution_time: u32,
    pub gas_used: i128,
}

// Storage keys
const ROUTES: Symbol = symbol_short!("ROUTES");
const ROUTE_COUNT: Symbol = symbol_short!("COUNT");
const CURRENCY_RATES: Symbol = symbol_short!("RATES");

#[contract]
pub struct RouteRegistryContract;

#[contractimpl]
impl RouteRegistryContract {
    /// Register a new route before execution
    pub fn register_route(
        env: Env,
        route_id: BytesN<32>,
        source_asset: String,
        dest_asset: String,
        expected_net: i128,
        sender: Address,
        recipient: Option<Address>,
        provider_name: String,
        route_legs: Vec<RouteLeg>,
    ) -> Result<(), Symbol> {
        // Verify sender authorization
        sender.require_auth();

        // Check if route already exists
        let routes_map = env.storage().persistent().get::<Symbol, Map<BytesN<32>, RouteData>>(&ROUTES)
            .unwrap_or(Map::new(&env));
        
        if routes_map.contains_key(route_id.clone()) {
            return Err(symbol_short!("EXISTS"));
        }

        // Create route data
        let route_data = RouteData {
            route_id: route_id.clone(),
            source_asset,
            dest_asset,
            expected_net,
            actual_net: None,
            sender: sender.clone(),
            recipient,
            registered_at: env.ledger().timestamp(),
            finalized_at: None,
            tx_hash: None,
            status: symbol_short!("REGISTER"),
            provider_name,
            route_legs,
        };

        // Store route data
        let mut updated_routes = routes_map;
        updated_routes.set(route_id.clone(), route_data.clone());
        env.storage().persistent().set(&ROUTES, &updated_routes);

        // Update route count
        let count: u32 = env.storage().persistent().get(&ROUTE_COUNT).unwrap_or(0);
        env.storage().persistent().set(&ROUTE_COUNT, &(count + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("ROUTE"), symbol_short!("REG")),
            (route_id, sender, expected_net)
        );

        log!(&env, "Route registered: {}", route_data.route_id);
        Ok(())
    }

    /// Execute a registered route with validation
    pub fn execute_route(
        env: Env,
        route_id: BytesN<32>,
        sender: Address,
    ) -> Result<(), Symbol> {
        sender.require_auth();

        let routes_map = env.storage().persistent().get::<Symbol, Map<BytesN<32>, RouteData>>(&ROUTES)
            .unwrap_or(Map::new(&env));
        
        let mut route_data = routes_map.get(route_id.clone())
            .ok_or(symbol_short!("NOTFOUND"))?;

        // Verify sender matches
        if route_data.sender != sender {
            return Err(symbol_short!("UNAUTH"));
        }

        // Check route status
        if route_data.status != symbol_short!("REGISTER") {
            return Err(symbol_short!("BADSTAT"));
        }

        // Update status to executing
        route_data.status = symbol_short!("EXEC");
        
        // Update routes map
        let mut updated_routes = routes_map;
        updated_routes.set(route_id.clone(), route_data.clone());
        env.storage().persistent().set(&ROUTES, &updated_routes);

        // Emit execution event
        env.events().publish(
            (symbol_short!("ROUTE"), symbol_short!("EXEC")),
            (route_id, sender)
        );

        log!(&env, "Route execution started: {}", route_data.route_id);
        Ok(())
    }

    /// Finalize a route after transaction completion
    pub fn finalize_route(
        env: Env,
        route_id: BytesN<32>,
        tx_hash: BytesN<32>,
        actual_net: i128,
        sender: Address,
    ) -> Result<i128, Symbol> {
        sender.require_auth();

        let routes_map = env.storage().persistent().get::<Symbol, Map<BytesN<32>, RouteData>>(&ROUTES)
            .unwrap_or(Map::new(&env));
        
        let mut route_data = routes_map.get(route_id.clone())
            .ok_or(symbol_short!("NOTFOUND"))?;

        // Verify sender matches
        if route_data.sender != sender {
            return Err(symbol_short!("UNAUTH"));
        }

        // Check route status
        if route_data.status != symbol_short!("EXEC") {
            return Err(symbol_short!("BADSTAT"));
        }

        // Calculate variance
        let variance = actual_net - route_data.expected_net;

        // Update route data
        route_data.actual_net = Some(actual_net);
        route_data.tx_hash = Some(tx_hash.clone());
        route_data.finalized_at = Some(env.ledger().timestamp());
        route_data.status = symbol_short!("FINAL");

        // Update routes map
        let mut updated_routes = routes_map;
        updated_routes.set(route_id.clone(), route_data.clone());
        env.storage().persistent().set(&ROUTES, &updated_routes);

        // Emit finalization event
        env.events().publish(
            (symbol_short!("ROUTE"), symbol_short!("FINAL")),
            (route_id, variance, tx_hash)
        );

        log!(&env, "Route finalized: {} with variance: {}", route_data.route_id, variance);
        Ok(variance)
    }

    /// Get route data by ID
    pub fn get_route(env: Env, route_id: BytesN<32>) -> Option<RouteData> {
        let routes_map = env.storage().persistent().get::<Symbol, Map<BytesN<32>, RouteData>>(&ROUTES)
            .unwrap_or(Map::new(&env));
        
        routes_map.get(route_id)
    }

    /// Get all routes for a sender
    pub fn get_user_routes(env: Env, sender: Address) -> Vec<RouteData> {
        let routes_map = env.storage().persistent().get::<Symbol, Map<BytesN<32>, RouteData>>(&ROUTES)
            .unwrap_or(Map::new(&env));
        
        let mut user_routes = Vec::new(&env);
        
        for route_data in routes_map.values() {
            if route_data.sender == sender {
                user_routes.push_back(route_data);
            }
        }
        
        user_routes
    }

    /// Update currency exchange rates (admin function)
    pub fn update_currency_rate(
        env: Env,
        admin: Address,
        source: String,
        destination: String,
        rate: i128,
    ) -> Result<(), Symbol> {
        admin.require_auth();
        
        // In a real implementation, you'd check admin privileges here
        
        let currency_pair = CurrencyPair {
            source: source.clone(),
            destination: destination.clone(),
            rate,
            last_updated: env.ledger().timestamp(),
        };

        let pair_key = format!("{}_{}", source, destination);
        env.storage().persistent().set(&Symbol::new(&env, &pair_key), &currency_pair);

        env.events().publish(
            (symbol_short!("RATE"), symbol_short!("UPDATE")),
            (source, destination, rate)
        );

        Ok(())
    }

    /// Get currency exchange rate
    pub fn get_currency_rate(env: Env, source: String, destination: String) -> Option<CurrencyPair> {
        let pair_key = format!("{}_{}", source, destination);
        env.storage().persistent().get(&Symbol::new(&env, &pair_key))
    }

    /// Get total route count
    pub fn get_route_count(env: Env) -> u32 {
        env.storage().persistent().get(&ROUTE_COUNT).unwrap_or(0)
    }

    /// Mark route as failed
    pub fn fail_route(
        env: Env,
        route_id: BytesN<32>,
        sender: Address,
        error_reason: String,
    ) -> Result<(), Symbol> {
        sender.require_auth();

        let routes_map = env.storage().persistent().get::<Symbol, Map<BytesN<32>, RouteData>>(&ROUTES)
            .unwrap_or(Map::new(&env));
        
        let mut route_data = routes_map.get(route_id.clone())
            .ok_or(symbol_short!("NOTFOUND"))?;

        // Verify sender matches
        if route_data.sender != sender {
            return Err(symbol_short!("UNAUTH"));
        }

        // Update status to failed
        route_data.status = symbol_short!("FAILED");
        route_data.finalized_at = Some(env.ledger().timestamp());

        // Update routes map
        let mut updated_routes = routes_map;
        updated_routes.set(route_id.clone(), route_data);
        env.storage().persistent().set(&ROUTES, &updated_routes);

        // Emit failure event
        env.events().publish(
            (symbol_short!("ROUTE"), symbol_short!("FAILED")),
            (route_id, sender, error_reason)
        );

        Ok(())
    }
}

// Helper function to format strings (for debugging)
fn format(s: &str) -> String {
    String::from_str(&Env::default(), s)
}