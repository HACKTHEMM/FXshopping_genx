#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, String, Vec};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    
    client.initialize(&admin);
    
    // Verify admin is set
    let stored_admin: Address = env.storage().instance().get(&symbol_short!("ADMIN")).unwrap();
    assert_eq!(stored_admin, admin);
}

#[test]
fn test_set_and_get_payment_rule() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 50_000_0000000, // 50,000 tokens
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: true,
        escrow_duration: 3600, // 1 hour
    };
    
    client.set_payment_rule(&sender, &rule);
    
    let retrieved_rule = client.get_payment_rule(&sender);
    assert_eq!(retrieved_rule, rule);
}

#[test]
fn test_is_payment_allowed() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let unauthorized_recipient = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 10_000_0000000, // 10,000 tokens
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 3600,
    };
    
    client.set_payment_rule(&sender, &rule);
    
    // Test allowed payment
    assert!(client.is_payment_allowed(&sender, &recipient, &5_000_0000000));
    
    // Test amount too high
    assert!(!client.is_payment_allowed(&sender, &recipient, &15_000_0000000));
    
    // Test unauthorized recipient
    assert!(!client.is_payment_allowed(&sender, &unauthorized_recipient, &5_000_0000000));
}

#[test]
fn test_create_escrow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 10_000_0000000,
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 3600,
    };
    
    client.set_payment_rule(&sender, &rule);
    
    let conditions = vec![&env, &String::from_str(&env, "Payment must be confirmed")];
    let escrow_id = client.create_escrow(&sender, &recipient, &5_000_0000000, &asset, &conditions);
    
    assert_eq!(escrow_id, 1);
    
    let escrow_info = client.get_escrow(&escrow_id);
    assert_eq!(escrow_info.sender, sender);
    assert_eq!(escrow_info.recipient, recipient);
    assert_eq!(escrow_info.amount, 5_000_0000000);
    assert_eq!(escrow_info.asset, asset);
    assert!(!escrow_info.released);
}

#[test]
fn test_release_escrow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 10_000_0000000,
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 3600,
    };
    
    client.set_payment_rule(&sender, &rule);
    
    let conditions = vec![&env];
    let escrow_id = client.create_escrow(&sender, &recipient, &5_000_0000000, &asset, &conditions);
    
    // Release escrow as recipient
    client.release_escrow(&escrow_id, &recipient);
    
    let escrow_info = client.get_escrow(&escrow_id);
    assert!(escrow_info.released);
}

#[test]
fn test_refund_escrow() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 10_000_0000000,
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 3600,
    };
    
    client.set_payment_rule(&sender, &rule);
    
    let conditions = vec![&env];
    let escrow_id = client.create_escrow(&sender, &recipient, &5_000_0000000, &asset, &conditions);
    
    // Refund escrow as sender
    client.refund_escrow(&escrow_id, &sender);
    
    let escrow_info = client.get_escrow(&escrow_id);
    assert!(escrow_info.released);
}

#[test]
fn test_list_user_escrows() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let asset = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 10_000_0000000,
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 3600,
    };
    
    client.set_payment_rule(&sender, &rule);
    
    let conditions = vec![&env];
    
    // Create multiple escrows
    let escrow_id1 = client.create_escrow(&sender, &recipient, &1_000_0000000, &asset, &conditions);
    let escrow_id2 = client.create_escrow(&sender, &recipient, &2_000_0000000, &asset, &conditions);
    
    let sender_escrows = client.list_user_escrows(&sender);
    let recipient_escrows = client.list_user_escrows(&recipient);
    
    assert_eq!(sender_escrows.len(), 2);
    assert_eq!(recipient_escrows.len(), 2);
    
    assert!(sender_escrows.contains(&escrow_id1));
    assert!(sender_escrows.contains(&escrow_id2));
    assert!(recipient_escrows.contains(&escrow_id1));
    assert!(recipient_escrows.contains(&escrow_id2));
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    
    client.initialize(&admin);
    client.initialize(&admin); // This should panic
}

#[test]
#[should_panic(expected = "Max amount must be positive")]
fn test_invalid_rule_max_amount() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 0, // Invalid amount
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 3600,
    };
    
    client.set_payment_rule(&sender, &rule); // This should panic
}

#[test]
#[should_panic(expected = "Escrow duration cannot exceed 7 days")]
fn test_invalid_rule_escrow_duration() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PaymentRulesContract);
    let client = PaymentRulesContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    client.initialize(&admin);
    
    let rule = PaymentRule {
        max_amount: 10_000_0000000,
        recipient_whitelist: vec![&env, &recipient],
        requires_approval: false,
        escrow_duration: 604801, // More than 7 days
    };
    
    client.set_payment_rule(&sender, &rule); // This should panic
}
