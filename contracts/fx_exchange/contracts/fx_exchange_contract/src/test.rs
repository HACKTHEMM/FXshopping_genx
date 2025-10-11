#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

fn create_token_contract<'a>(e: &Env, admin: &Address) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
    let addr = e.register_stellar_asset_contract_v2(admin.clone());
    (
        addr.address(),
        TokenClient::new(e, &addr.address()),
        addr,
    )
}

fn create_fx_exchange_contract<'a>(e: &Env) -> (Address, FXExchangeClient<'a>) {
    let contract_id = e.register(FXExchange, ());
    (contract_id.clone(), FXExchangeClient::new(e, &contract_id))
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (contract_id, client) = create_fx_exchange_contract(&env);

    client.initialize(&admin, &30);

    // Verify initialization worked by trying to set a rate (admin only function)
    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    client.set_rate(&asset1, &asset2, &10_000_000); // 1:1 rate
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_, client) = create_fx_exchange_contract(&env);

    client.initialize(&admin, &30);
    client.initialize(&admin, &30); // Should panic
}

#[test]
fn test_set_and_get_rate() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);
    let rate = 85_000_000i128; // 8.5:1 rate (scaled by 10^7)

    client.set_rate(&asset1, &asset2, &rate);

    let retrieved_rate = client.get_rate(&asset1, &asset2);
    assert_eq!(retrieved_rate, Ok(rate));
}

#[test]
fn test_get_quote() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);
    let rate = 10_000_000i128; // 1:1 rate

    client.set_rate(&asset1, &asset2, &rate);
    client.set_liquidity(&asset2, &1_000_000_000);

    let quote = client.get_quote(&asset1, &asset2, &100_000_000);

    assert!(quote.is_ok());
    let quote_data = quote.unwrap();

    // With 1:1 rate and 100M input, should get 100M output
    assert_eq!(quote_data.amount_out, 100_000_000);
    assert_eq!(quote_data.rate, rate);
}

#[test]
fn test_swap_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    // Create two tokens
    let (asset1_addr, asset1_token, asset1_admin) = create_token_contract(&env, &admin);
    let (asset2_addr, asset2_token, asset2_admin) = create_token_contract(&env, &admin);

    // Mint tokens
    asset1_admin.mint(&user, &1_000_000_000);
    asset2_admin.mint(&client.address, &1_000_000_000);

    // Set up rate and liquidity
    client.set_rate(&asset1_addr, &asset2_addr, &10_000_000); // 1:1
    client.set_liquidity(&asset2_addr, &1_000_000_000);

    // Execute swap
    let amount_in = 100_000_000i128;
    let min_receive = 95_000_000i128; // Allow 5% slippage

    let result = client.swap(
        &user,
        &asset1_addr,
        &asset2_addr,
        &amount_in,
        &min_receive,
    );

    assert!(result.is_ok());
}

#[test]
fn test_swap_slippage_exceeded() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    // Set up rate and liquidity
    client.set_rate(&asset1, &asset2, &10_000_000); // 1:1
    client.set_liquidity(&asset2, &1_000_000_000);

    // Try to swap with unrealistic min_receive
    let amount_in = 100_000_000i128;
    let min_receive = 200_000_000i128; // Expect 2x output (impossible)

    let result = client.try_swap(
        &user,
        &asset1,
        &asset2,
        &amount_in,
        &min_receive,
    );

    assert_eq!(result, Err(Ok(Error::SlippageExceeded)));
}

#[test]
fn test_swap_insufficient_liquidity() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    // Set rate but very low liquidity
    client.set_rate(&asset1, &asset2, &10_000_000);
    client.set_liquidity(&asset2, &1_000); // Very low

    let amount_in = 100_000_000i128; // Try to swap more than available
    let min_receive = 50_000_000i128;

    let result = client.try_get_quote(&asset1, &asset2, &amount_in);

    assert_eq!(result, Err(Ok(Error::InsufficientLiquidity)));
}

#[test]
fn test_invalid_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    client.set_rate(&asset1, &asset2, &10_000_000);

    // Try to get quote with zero amount
    let result = client.try_get_quote(&asset1, &asset2, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    // Try with negative amount
    let result = client.try_get_quote(&asset1, &asset2, &-100);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_pause_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    client.set_rate(&asset1, &asset2, &10_000_000);
    client.set_liquidity(&asset2, &1_000_000_000);

    // Pause the contract
    client.set_paused(&true);

    // Try to swap while paused
    let result = client.try_swap(
        &user,
        &asset1,
        &asset2,
        &100_000_000,
        &95_000_000,
    );

    assert_eq!(result, Err(Ok(Error::ContractPaused)));

    // Unpause
    client.set_paused(&false);

    // Should work now (though will fail without actual tokens)
    let result = client.try_get_quote(&asset1, &asset2, &100_000_000);
    assert!(result.is_ok());
}

#[test]
fn test_unsupported_pair() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30);

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    // Try to get rate without setting it
    let result = client.try_get_rate(&asset1, &asset2);
    assert_eq!(result, Err(Ok(Error::UnsupportedPair)));
}

#[test]
fn test_fee_calculation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (_, client) = create_fx_exchange_contract(&env);
    client.initialize(&admin, &30); // 0.3% fee (30 basis points)

    let asset1 = Address::generate(&env);
    let asset2 = Address::generate(&env);

    client.set_rate(&asset1, &asset2, &10_000_000); // 1:1
    client.set_liquidity(&asset2, &1_000_000_000);

    let quote = client.get_quote(&asset1, &asset2, &1_000_000_000).unwrap();

    // Fee should be 0.3% of output
    let expected_fee = 1_000_000_000 * 30 / 10_000;
    assert_eq!(quote.fee, expected_fee);
}
