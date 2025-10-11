# Soroban Smart Contract Migration Plan

## Project Overview
Migrating FXshopping transaction logic from direct Stellar operations to Soroban smart contracts for enhanced programmability, security, and composability.

**Start Date**: October 11, 2025
**Target Completion**: November 10, 2025 (30 days)
**Current Status**: 🟡 Phase 1 - In Progress

---

## Table of Contents
1. [Migration Phases](#migration-phases)
2. [Technical Architecture](#technical-architecture)
3. [Progress Tracker](#progress-tracker)
4. [Setup Instructions](#setup-instructions)
5. [Contract Specifications](#contract-specifications)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Resources](#resources)

---

## Migration Phases

### ✅ Phase 1: Environment Setup & Planning (Days 1-2)
**Goal**: Set up Soroban development environment and project structure

**Tasks**:
- [ ] Install Rust toolchain (rustup)
- [ ] Install Soroban CLI
- [ ] Create `/contracts` directory structure
- [ ] Set up local Soroban sandbox
- [ ] Configure Stellar testnet for Soroban
- [ ] Create `/lib/soroban-integration.ts`
- [ ] Update package.json dependencies
- [ ] Create documentation structure

**Deliverables**:
- Working Rust/Soroban development environment
- Project structure ready for contract development
- This documentation file

---

### ⬜ Phase 2: Smart Contract Design (Days 3-5)
**Goal**: Design contract architecture and interfaces

**Contracts to Design**:

#### 1. FX Exchange Contract
```
Purpose: Core currency swap functionality
Functions:
  - swap(from_asset, to_asset, amount, min_receive) -> amount
  - get_quote(from_asset, to_asset, amount) -> quote
  - get_rate(from_asset, to_asset) -> rate
  - set_liquidity_pool(asset, amount)
State:
  - liquidity_pools: Map<Asset, i128>
  - exchange_rates: Map<(Asset, Asset), i128>
  - fee_bps: u32 (basis points)
```

#### 2. Escrow Contract
```
Purpose: Secure fund holding during transactions
Functions:
  - deposit(asset, amount, recipient, timeout) -> escrow_id
  - release(escrow_id)
  - refund(escrow_id)
  - extend_timeout(escrow_id, new_timeout)
State:
  - escrows: Map<u64, Escrow>
  - next_escrow_id: u64
```

#### 3. Router Contract
```
Purpose: Multi-path routing optimization
Functions:
  - find_best_path(from, to, amount) -> path
  - execute_swap(path, amount, min_receive) -> amount
State:
  - registered_exchanges: Vec<Address>
  - path_cache: Map<(Asset, Asset), Path>
```

**Tasks**:
- [ ] Define data structures (Asset, Quote, Path, etc.)
- [ ] Design error types and handling
- [ ] Plan event emissions for tracking
- [ ] Create contract interaction diagrams
- [ ] Write interface specifications

---

### ⬜ Phase 3: Smart Contract Development (Days 6-12)
**Goal**: Implement Rust smart contracts

**FX Exchange Contract** (`contracts/fx_exchange/`):
- [ ] Initialize contract skeleton
- [ ] Implement swap() function
- [ ] Implement get_quote() function
- [ ] Implement liquidity management
- [ ] Add access control
- [ ] Implement fee calculation
- [ ] Add slippage protection
- [ ] Implement emergency pause

**Escrow Contract** (`contracts/escrow/`):
- [ ] Initialize contract skeleton
- [ ] Implement deposit() function
- [ ] Implement release() function
- [ ] Implement refund() function
- [ ] Add timelock mechanism
- [ ] Add multi-party approval logic

**Router Contract** (`contracts/router/`):
- [ ] Initialize contract skeleton
- [ ] Implement path finding algorithm
- [ ] Implement execute_swap() function
- [ ] Add exchange registry

**Security Features**:
- [ ] Reentrancy guards
- [ ] Input validation
- [ ] Access control (admin functions)
- [ ] Emergency pause mechanism
- [ ] Rate limiting

---

### ⬜ Phase 4: Contract Testing (Days 13-15)
**Goal**: Comprehensive testing of all contracts

**Unit Tests**:
- [ ] FX Exchange: swap success cases
- [ ] FX Exchange: slippage failures
- [ ] FX Exchange: insufficient liquidity
- [ ] Escrow: deposit and release
- [ ] Escrow: timeout and refund
- [ ] Router: path finding
- [ ] Router: multi-hop swaps

**Integration Tests**:
- [ ] FX Exchange + Escrow flow
- [ ] Router + FX Exchange flow
- [ ] Multi-contract atomic transactions

**Testnet Deployment**:
- [ ] Deploy FX Exchange to testnet
- [ ] Deploy Escrow to testnet
- [ ] Deploy Router to testnet
- [ ] Verify contract addresses
- [ ] Test via Soroban CLI
- [ ] Document testnet contract IDs

---

### ⬜ Phase 5: Frontend Integration (Days 16-20)
**Goal**: Integrate contracts with Next.js frontend

**Soroban Integration Layer** (`lib/soroban-integration.ts`):
- [ ] Install soroban-client npm package
- [ ] Create contract client wrappers
- [ ] Implement swap transaction builder
- [ ] Implement quote fetching
- [ ] Add error handling and parsing
- [ ] Create type definitions

**Transaction Updates** (`lib/stellar-transaction.ts`):
- [ ] Replace pathPaymentStrictSend with contract invocation
- [ ] Update buildPathPaymentTransaction()
- [ ] Add contract parameter encoding
- [ ] Update transaction simulation
- [ ] Maintain backward compatibility (feature flag)

**Wallet Integration** (`lib/freighter-integration.ts`):
- [ ] Verify Freighter Soroban support
- [ ] Update signWithFreighter() for contract calls
- [ ] Add contract-specific error messages
- [ ] Test Soroban transaction signing

**UI Updates**:
- [ ] Add contract address display
- [ ] Show on-chain vs off-chain indicators
- [ ] Update transaction confirmation UI
- [ ] Add contract event logs display

---

### ⬜ Phase 6: Advanced Features (Days 21-25)
**Goal**: Implement advanced on-chain features

**On-Chain Rate Oracle**:
- [ ] Design oracle contract
- [ ] Implement price feed aggregation
- [ ] Add update mechanism
- [ ] Set up keeper/bot for rate updates
- [ ] Test oracle reliability

**Transaction History**:
- [ ] Design history storage pattern
- [ ] Implement on-chain history logging
- [ ] Create query functions
- [ ] Build UI for history display
- [ ] Add filtering and search

**Fee Distribution**:
- [ ] Implement protocol fee collection
- [ ] Create LP reward distribution
- [ ] Add fee claim functions
- [ ] Build admin dashboard for fees
- [ ] Document fee structure

**Additional Features**:
- [ ] Limit orders (if applicable)
- [ ] Recurring swaps
- [ ] Dollar-cost averaging
- [ ] Referral system

---

### ⬜ Phase 7: Security & Optimization (Days 26-28)
**Goal**: Audit, optimize, and secure contracts

**Security Audit**:
- [ ] Internal code review checklist
- [ ] Check for reentrancy vulnerabilities
- [ ] Verify access control
- [ ] Test integer overflow/underflow
- [ ] Review external dependencies
- [ ] Document security assumptions
- [ ] Consider OpenZeppelin audit (if budget allows)

**Optimization**:
- [ ] Profile gas costs
- [ ] Optimize storage operations
- [ ] Minimize compute operations
- [ ] Batch operations where possible
- [ ] Implement efficient data structures

**Load Testing**:
- [ ] Simulate high transaction volume
- [ ] Test concurrent operations
- [ ] Monitor contract performance
- [ ] Identify bottlenecks
- [ ] Optimize critical paths

---

### ⬜ Phase 8: Deployment & Migration (Days 29-30)
**Goal**: Deploy to mainnet and migrate users

**Mainnet Deployment**:
- [ ] Final security review
- [ ] Deploy contracts to mainnet
- [ ] Verify contract addresses
- [ ] Update frontend configuration
- [ ] Test end-to-end on mainnet
- [ ] Set up monitoring

**Migration Strategy**:
- [ ] Implement feature flag system
- [ ] Create A/B testing framework
- [ ] Deploy frontend with flag disabled
- [ ] Enable for 1% of users
- [ ] Monitor for issues
- [ ] Gradually increase to 10%, 50%, 100%

**Documentation & Support**:
- [ ] Write user migration guide
- [ ] Create developer documentation
- [ ] Document contract ABIs
- [ ] Set up monitoring dashboard
- [ ] Create incident response plan
- [ ] Prepare FAQ

---

## Technical Architecture

### Current Architecture (Before Migration)
```
User → Freighter Wallet → Stellar SDK → Horizon API → Stellar Network
                              ↓
                    pathPaymentStrictSend
                              ↓
                    Direct ledger operation
```

### Target Architecture (After Migration)
```
User → Freighter Wallet → Soroban Client → RPC Server → Stellar Network
                              ↓                              ↓
                    Contract Invocation              Smart Contracts:
                              ↓                       - FX Exchange
                    Programmable Logic               - Escrow
                              ↓                       - Router
                    Complex multi-step ops           - Oracle
```

### Contract Interaction Flow
```
1. User initiates swap on frontend
2. Frontend queries Router contract for best path
3. Router returns optimal path through liquidity sources
4. User approves transaction in Freighter
5. Transaction invokes FX Exchange contract
6. Contract executes swap logic:
   - Validates inputs
   - Checks slippage
   - Transfers tokens
   - Emits events
7. Frontend displays confirmation + explorer link
```

---

## Progress Tracker

### Overall Progress: 5% Complete

| Phase | Status | Progress | Start Date | End Date |
|-------|--------|----------|------------|----------|
| Phase 1: Setup | 🟡 In Progress | 20% | Oct 11 | - |
| Phase 2: Design | ⬜ Not Started | 0% | - | - |
| Phase 3: Development | ⬜ Not Started | 0% | - | - |
| Phase 4: Testing | ⬜ Not Started | 0% | - | - |
| Phase 5: Integration | ⬜ Not Started | 0% | - | - |
| Phase 6: Advanced | ⬜ Not Started | 0% | - | - |
| Phase 7: Security | ⬜ Not Started | 0% | - | - |
| Phase 8: Deployment | ⬜ Not Started | 0% | - | - |

### Recent Updates

#### October 11, 2025
- ✅ Created migration plan documentation
- 🟡 Starting Phase 1: Environment setup
- 📝 Analyzed existing codebase structure

---

## Setup Instructions

### Prerequisites
- **Node.js**: v20+ (already installed)
- **Rust**: 1.74+ (to be installed)
- **Soroban CLI**: Latest version
- **Git**: For version control
- **Freighter Wallet**: Browser extension

### Installation Steps

#### 1. Install Rust Toolchain
```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe
.\rustup-init.exe

# Verify installation
rustc --version
cargo --version
```

#### 2. Add WebAssembly Target
```bash
rustup target add wasm32-unknown-unknown
```

#### 3. Install Soroban CLI
```bash
cargo install --locked soroban-cli --features opt
```

#### 4. Verify Soroban Installation
```bash
soroban --version
```

#### 5. Configure Stellar Testnet
```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

#### 6. Create Soroban Identity (for deployment)
```bash
soroban keys generate --global deployer --network testnet
soroban keys address deployer
```

#### 7. Fund Deployer Account
```bash
# Get testnet XLM from friendbot
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"
```

### Project Setup

#### Create Contracts Directory
```bash
mkdir contracts
cd contracts
```

#### Initialize First Contract
```bash
soroban contract init fx_exchange
cd fx_exchange
```

#### Install Node Dependencies
```bash
npm install soroban-client
```

---

## Contract Specifications

### FX Exchange Contract

**Contract ID (Testnet)**: `TBD`
**Contract ID (Mainnet)**: `TBD`

#### Interface
```rust
pub trait FXExchangeTrait {
    /// Execute a currency swap
    fn swap(
        env: Env,
        sender: Address,
        from_asset: Address,
        to_asset: Address,
        amount: i128,
        min_receive: i128,
    ) -> Result<i128, Error>;

    /// Get a quote for a swap
    fn get_quote(
        env: Env,
        from_asset: Address,
        to_asset: Address,
        amount: i128,
    ) -> Result<i128, Error>;

    /// Get current exchange rate
    fn get_rate(
        env: Env,
        from_asset: Address,
        to_asset: Address,
    ) -> Result<i128, Error>;
}
```

#### Events
```rust
// Emitted on successful swap
pub struct SwapEvent {
    pub sender: Address,
    pub from_asset: Address,
    pub to_asset: Address,
    pub amount_in: i128,
    pub amount_out: i128,
    pub fee: i128,
}
```

#### Error Codes
```rust
pub enum Error {
    InsufficientLiquidity = 1,
    SlippageExceeded = 2,
    InvalidAsset = 3,
    InvalidAmount = 4,
    Unauthorized = 5,
    ContractPaused = 6,
}
```

### Escrow Contract

**Contract ID (Testnet)**: `TBD`
**Contract ID (Mainnet)**: `TBD`

#### Interface
```rust
pub trait EscrowTrait {
    /// Create an escrow
    fn deposit(
        env: Env,
        sender: Address,
        asset: Address,
        amount: i128,
        recipient: Address,
        timeout: u64,
    ) -> Result<u64, Error>;

    /// Release funds to recipient
    fn release(env: Env, escrow_id: u64) -> Result<(), Error>;

    /// Refund to sender (after timeout)
    fn refund(env: Env, escrow_id: u64) -> Result<(), Error>;
}
```

---

## Testing Strategy

### Unit Testing
- Test each function in isolation
- Mock external dependencies
- Cover edge cases and error scenarios
- Aim for >90% code coverage

### Integration Testing
- Test contract-to-contract interactions
- Test with real Soroban runtime
- Verify event emissions
- Test transaction atomicity

### End-to-End Testing
- Test complete user flows
- Use testnet deployment
- Test with Freighter wallet
- Verify UI updates

### Security Testing
- Fuzz testing with arbitrary inputs
- Reentrancy attack simulation
- Integer overflow/underflow tests
- Access control verification

---

## Deployment Plan

### Testnet Deployment Checklist
- [ ] All tests passing
- [ ] Contract optimized for gas
- [ ] Documentation complete
- [ ] Deploy script ready
- [ ] Deployer account funded

### Mainnet Deployment Checklist
- [ ] Security audit complete
- [ ] Load testing passed
- [ ] Emergency procedures documented
- [ ] Monitoring setup complete
- [ ] Rollback plan ready
- [ ] User communication sent

---

## Resources

### Documentation
- [Soroban Docs](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar SDK Docs](https://stellar.github.io/js-stellar-sdk/)
- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Rust Book](https://doc.rust-lang.org/book/)

### Tools
- [Stellar Expert (Explorer)](https://stellar.expert/explorer/testnet)
- [Soroban CLI Docs](https://developers.stellar.org/docs/tools/developer-tools/cli/soroban-cli)
- [Freighter Wallet](https://www.freighter.app/)

### Community
- [Stellar Discord](https://discord.gg/stellar)
- [Stellar Stack Exchange](https://stellar.stackexchange.com/)
- [GitHub Discussions](https://github.com/stellar/soroban-examples/discussions)

### Security
- [OpenZeppelin Stellar Audits](https://stellar.org/audit-bank/projects)
- [Soroban Security Best Practices](https://developers.stellar.org/docs/build/smart-contracts/best-practices)

---

## Notes & Decisions

### Architecture Decisions
- **Why Soroban over standard Stellar ops?**
  - Need programmable swap logic
  - Want composability with other contracts
  - Future: complex DeFi features (limit orders, LP rewards)

- **Why separate Router contract?**
  - Modularity: upgrade routing without touching FX logic
  - Flexibility: can add new exchanges easily
  - Gas optimization: cache path calculations

### Open Questions
- [ ] Should we use existing DEX contracts or build custom?
- [ ] Oracle update frequency: real-time vs. periodic?
- [ ] Fee structure: flat vs. percentage vs. tiered?
- [ ] Multi-sig admin or single admin for initial launch?

### Risks & Mitigations
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Smart contract bug | High | Medium | Thorough testing + audit |
| Gas costs too high | Medium | Low | Optimize before mainnet |
| Low liquidity | Medium | Medium | Partner with LPs |
| User adoption slow | Low | Medium | Gradual migration + incentives |

---

## Changelog

### 2025-10-11
- Initial migration plan created
- Project structure defined
- Phase 1 started

---

**Last Updated**: October 11, 2025
**Maintained By**: Development Team
**Version**: 1.0.0
