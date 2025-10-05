#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, vec, Address, Env, Map, String, Symbol, Vec};

#[contract]
pub struct PaymentRulesContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRule {
    pub max_amount: i128,
    pub recipient_whitelist: Vec<Address>,
    pub requires_approval: bool,
    pub escrow_duration: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowInfo {
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub asset: Address,
    pub created_at: u64,
    pub expires_at: u64,
    pub released: bool,
    pub conditions: Vec<String>,
}

#[contractimpl]
impl PaymentRulesContract {
    /// Initialize the contract with default payment rules
    pub fn initialize(env: &Env, admin: Address) {
        if env.storage().instance().has(&symbol_short!("ADMIN")) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&symbol_short!("ADMIN"), &admin);
        
        // Set default payment rules
        let default_rule = PaymentRule {
            max_amount: 100_000_0000000, // 100,000 tokens (assuming 7 decimals)
            recipient_whitelist: vec![&env],
            requires_approval: false,
            escrow_duration: 86400, // 24 hours in seconds
        };
        
        env.storage().instance().set(&symbol_short!("DEFAULT_RULE"), &default_rule);
    }

    /// Set payment rules for a specific sender
    pub fn set_payment_rule(env: &Env, sender: Address, rule: PaymentRule) {
        Self::require_admin(env);
        
        // Validate rule
        if rule.max_amount <= 0 {
            panic!("Max amount must be positive");
        }
        
        if rule.escrow_duration > 604800 { // Max 7 days
            panic!("Escrow duration cannot exceed 7 days");
        }
        
        env.storage().persistent().set(&(symbol_short!("RULE"), sender), &rule);
    }

    /// Get payment rules for a sender
    pub fn get_payment_rule(env: &Env, sender: Address) -> PaymentRule {
        if env.storage().persistent().has(&(symbol_short!("RULE"), sender.clone())) {
            env.storage().persistent().get(&(symbol_short!("RULE"), sender)).unwrap()
        } else {
            env.storage().instance().get(&symbol_short!("DEFAULT_RULE")).unwrap()
        }
    }

    /// Check if a payment is allowed
    pub fn is_payment_allowed(env: &Env, sender: Address, recipient: Address, amount: i128) -> bool {
        let rule = Self::get_payment_rule(env, sender.clone());
        
        // Check amount limit
        if amount > rule.max_amount {
            return false;
        }
        
        // Check recipient whitelist (if not empty)
        if !rule.recipient_whitelist.is_empty() {
            let mut allowed = false;
            for addr in rule.recipient_whitelist.iter() {
                if addr == recipient {
                    allowed = true;
                    break;
                }
            }
            if !allowed {
                return false;
            }
        }
        
        true
    }

    /// Create an escrow for a payment
    pub fn create_escrow(
        env: &Env,
        sender: Address,
        recipient: Address,
        amount: i128,
        asset: Address,
        conditions: Vec<String>
    ) -> u32 {
        let rule = Self::get_payment_rule(env, sender.clone());
        
        // Check if payment is allowed
        if !Self::is_payment_allowed(env, sender.clone(), recipient.clone(), amount) {
            panic!("Payment not allowed");
        }
        
        // Generate escrow ID
        let escrow_id = env.storage().instance().get(&symbol_short!("NEXT_ID")).unwrap_or(0) + 1;
        env.storage().instance().set(&symbol_short!("NEXT_ID"), &escrow_id);
        
        let current_time = env.ledger().timestamp();
        let escrow_info = EscrowInfo {
            sender: sender.clone(),
            recipient: recipient.clone(),
            amount,
            asset: asset.clone(),
            created_at: current_time,
            expires_at: current_time + rule.escrow_duration,
            released: false,
            conditions,
        };
        
        env.storage().persistent().set(&(symbol_short!("ESCROW"), escrow_id), &escrow_info);
        
        // Emit event
        env.events().publish(
            (symbol_short!("escrow_created"), escrow_id),
            (sender, recipient, amount, asset)
        );
        
        escrow_id
    }

    /// Release escrow funds
    pub fn release_escrow(env: &Env, escrow_id: u32, releaser: Address) {
        let mut escrow_info: EscrowInfo = env.storage().persistent()
            .get(&(symbol_short!("ESCROW"), escrow_id))
            .unwrap_or_else(|| panic!("Escrow not found"));
        
        if escrow_info.released {
            panic!("Escrow already released");
        }
        
        // Check if releaser is authorized
        let rule = Self::get_payment_rule(env, escrow_info.sender.clone());
        let is_admin = env.storage().instance().get(&symbol_short!("ADMIN")).unwrap() == releaser;
        let is_sender = escrow_info.sender == releaser;
        let is_recipient = escrow_info.recipient == releaser;
        
        if !is_admin && !is_sender && !is_recipient {
            panic!("Not authorized to release escrow");
        }
        
        // Check if escrow has expired
        if env.ledger().timestamp() > escrow_info.expires_at {
            panic!("Escrow has expired");
        }
        
        // Mark as released
        escrow_info.released = true;
        env.storage().persistent().set(&(symbol_short!("ESCROW"), escrow_id), &escrow_info);
        
        // Emit event
        env.events().publish(
            (symbol_short!("escrow_released"), escrow_id),
            (escrow_info.sender, escrow_info.recipient, escrow_info.amount, escrow_info.asset)
        );
    }

    /// Refund escrow (only sender or admin can do this)
    pub fn refund_escrow(env: &Env, escrow_id: u32, refunder: Address) {
        let mut escrow_info: EscrowInfo = env.storage().persistent()
            .get(&(symbol_short!("ESCROW"), escrow_id))
            .unwrap_or_else(|| panic!("Escrow not found"));
        
        if escrow_info.released {
            panic!("Escrow already released");
        }
        
        // Check if refunder is authorized
        let is_admin = env.storage().instance().get(&symbol_short!("ADMIN")).unwrap() == refunder;
        let is_sender = escrow_info.sender == refunder;
        
        if !is_admin && !is_sender {
            panic!("Not authorized to refund escrow");
        }
        
        // Mark as released (refunded)
        escrow_info.released = true;
        env.storage().persistent().set(&(symbol_short!("ESCROW"), escrow_id), &escrow_info);
        
        // Emit event
        env.events().publish(
            (symbol_short!("escrow_refunded"), escrow_id),
            (escrow_info.sender, escrow_info.recipient, escrow_info.amount, escrow_info.asset)
        );
    }

    /// Get escrow information
    pub fn get_escrow(env: &Env, escrow_id: u32) -> EscrowInfo {
        env.storage().persistent()
            .get(&(symbol_short!("ESCROW"), escrow_id))
            .unwrap_or_else(|| panic!("Escrow not found"))
    }

    /// List escrows for a user
    pub fn list_user_escrows(env: &Env, user: Address) -> Vec<u32> {
        let mut escrows = Vec::new(&env);
        let next_id = env.storage().instance().get(&symbol_short!("NEXT_ID")).unwrap_or(0);
        
        for i in 1..=next_id {
            if let Some(escrow_info) = env.storage().persistent().get(&(symbol_short!("ESCROW"), i)) {
                if escrow_info.sender == user || escrow_info.recipient == user {
                    escrows.push_back(i);
                }
            }
        }
        
        escrows
    }

    /// Update admin (only current admin can do this)
    pub fn update_admin(env: &Env, new_admin: Address) {
        Self::require_admin(env);
        env.storage().instance().set(&symbol_short!("ADMIN"), &new_admin);
    }

    /// Require admin access
    fn require_admin(env: &Env) {
        let caller = env.current_contract_address();
        let admin = env.storage().instance().get(&symbol_short!("ADMIN")).unwrap();
        
        // In a real implementation, you would check the caller against the admin
        // For this demo, we'll use a different approach
        if caller != admin {
            panic!("Admin access required");
        }
    }

    /// Get contract version
    pub fn version() -> u32 {
        1
    }
}

#[cfg(test)]
mod test;
