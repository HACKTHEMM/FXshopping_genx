#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String, BytesN};

use crate::{RouteRegistry, RouteData, Symbol};

#[test]
fn test_register_and_finalize_route() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RouteRegistry);
    let client = RouteRegistryClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let route_id = String::from_str(&env, "test_route_123");
    let expected_net = 1000i128;
    let actual_net = 995i128;
    let tx_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Register route
    let attestation_hash = client.register_route(&route_id, &expected_net, &user);
    assert!(!attestation_hash.is_empty());

    // Finalize route
    let variance = client.finalize_route(&route_id, &tx_hash, &actual_net);
    assert_eq!(variance, -5i128); // 995 - 1000 = -5

    // Query route
    let route_data = client.get_route(&route_id).unwrap();
    assert_eq!(route_data.route_id, route_id);
    assert_eq!(route_data.expected_net, expected_net);
    assert_eq!(route_data.actual_net, Some(actual_net));
    assert_eq!(route_data.sender, user);
    assert_eq!(route_data.status, Symbol::new(&env, "finalized"));
    assert_eq!(route_data.variance, Some(-5i128));
}

#[test]
fn test_route_not_found() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RouteRegistry);
    let client = RouteRegistryClient::new(&env, &contract_id);

    let route_id = String::from_str(&env, "nonexistent_route");
    let result = client.get_route(&route_id);
    assert!(result.is_none());
}
