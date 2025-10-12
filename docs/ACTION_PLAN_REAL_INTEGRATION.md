# Action Plan: Real Integration & Smart Contracts

**Date:** October 10, 2025
**Goal:** Transform simulations into real integrations

---

## 📋 Your Questions Addressed

### ✅ 1. Testnet vs Dummy Audit
**Status:** COMPLETE
**Document:** `TESTNET_VS_DUMMY_AUDIT.md`

**Summary:**
- ✅ **REAL:** Assets, orderbook, path finding, FX rates, network fees
- ❌ **DUMMY:** Anchor deposit/withdrawal, provider quotes, transaction signing, smart contracts

**Next Actions:** See sections 2-5 below

---

## 🏦 2. Real INR ↔ INRTOKEN Conversion

### Current State:
- ❌ **Simulated** 1:1 peg in `lib/anchor-simulation.ts`
- ❌ No real bank integration
- ❌ Instant "completion" (unrealistic)

### Solution Options:

#### Option A: **Stellar Oracle Integration** (RECOMMENDED for MVP)
**Pros:**
- More realistic than 1:1 assumption
- Can use real price data
- No KYC requirements for testing
- Works on testnet immediately

**Implementation:**
1. **Use Reflector Oracle or LightEcho Oracle**
   - Reflector: https://reflector.stellar.expert
   - LightEcho: Emerging market data (perfect for INR!)

2. **Price Feed Contract:**
```rust
// Soroban contract to fetch INR/USD price
use soroban_sdk::{ contract, contractimpl, Address, Env };

#[contract]
pub struct PriceOracle;

#[contractimpl]
impl PriceOracle {
    pub fn get_inr_usd_price(env: Env) -> i128 {
        // Query Reflector/LightEcho oracle
        // Returns price in stroops
    }
}
```

3. **Update Anchor Simulation:**
```typescript
// lib/anchor-simulation.ts
async simulateDeposit(fiatCurrency: string, tokenCurrency: string, fiatAmount: number) {
  // Instead of 1:1, fetch real rate from oracle
  const oracleRate = await this.getOracleRate(fiatCurrency);
  const tokenAmount = (fiatAmount - depositFee) * oracleRate;

  return {
    //... with real rate
  };
}

private async getOracleRate(currency: string): Promise<number> {
  // Call Soroban oracle contract
  // For INR: fetch from LightEcho
  // For USD: 1.0 (or USDC oracle)
}
```

**Timeline:** 2-3 hours

#### Option B: **Real Anchor Integration (Vibrant/MoneyGram)**
**Pros:**
- Production-ready
- Real fiat movement
- SEP-24 compliant

**Cons:**
- Vibrant is a wallet, not an anchor service
- MoneyGram Access requires partnership
- KYC requirements
- Mainnet only (no testnet)

**Recommendation:** Use for future production, not MVP

#### Option C: **Use testanchor.stellar.org**
**Limitation:** Only supports digital assets (SRT, USDC, XLM), not fiat currencies

---

## 💱 3. Traditional Company Rates Verification

### Current Implementation:

#### ✅ **REAL - FX Base Rates:**
- **Source:** ExchangeRate-API
- **Accuracy:** ✅ Real mid-market rates
- **Update Frequency:** Daily
- **Verification:** Can test at exchangerate-api.com/v4/latest/USD

#### ❌ **ESTIMATED - Provider Fees:**
| Provider | Fee Source | Real-Time? | How to Verify |
|----------|------------|------------|---------------|
| **Wise** | Static (0.43%) | ❌ No | Check wise.com/pricing for your corridor |
| **MoneyGram** | Static ($5 + 2.5%) | ❌ No | Check moneygram.com/estimate |
| **Western Union** | Static ($8 + 3.5%) | ❌ No | Check westernunion.com/price-estimator |
| **Remitly** | Static ($1.99 + 1.5%) | ❌ No | Check remitly.com |

### Making It More Accurate:

#### Short-term (Current):
```
✅ Base Rate: REAL (ExchangeRate-API)
✅ Fee Structure: ESTIMATED but REALISTIC (from 2025 public pricing)
✅ Calculation: ACCURATE (proper math)
= REASONABLY ACCURATE ESTIMATES
```

#### Medium-term (With APIs):
```typescript
// Future: Wise API Integration
const wiseQuote = await fetch('https://api.wise.com/v3/quotes', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${WISE_API_KEY}` },
  body: JSON.stringify({
    source: 'INR',
    target: 'USD',
    sourceAmount: 10000
  })
});
// Would give REAL-TIME quote with exact fees
```

**Problem:** Most providers don't have public APIs:
- ✅ **Wise:** Has API (requires partnership)
- ❌ **MoneyGram:** No public API
- ❌ **Western Union:** No public API
- ❌ **Remitly:** Limited API access

**Verdict:** Current implementation is **reasonably accurate** for comparison purposes but not real-time quotes.

---

## 💳 4. Actual Freighter Wallet Transaction

### Current State:
- ❌ No XDR building
- ❌ No wallet integration
- ❌ Just shows alert()

### Implementation Plan:

#### Step 1: Install Dependencies
```bash
npm install @stellar/stellar-sdk @stellar/freighter-api
```

#### Step 2: Create Transaction Builder
```typescript
// lib/stellar-transaction.ts
import {
  Server,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';

export async function buildPathPaymentTransaction(
  sourcePublicKey: string,
  route: RouteQuote
): Promise<string> {
  const server = new Server('https://horizon-testnet.stellar.org');
  const sourceAccount = await server.loadAccount(sourcePublicKey);

  // Build path payment strict send operation
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: new Asset(
          route.sendAsset.code,
          route.sendAsset.issuer
        ),
        sendAmount: route.grossSend.toString(),
        destination: route.destinationAddress || sourcePublicKey,
        destAsset: new Asset(
          route.destAsset.code,
          route.destAsset.issuer
        ),
        destMin: (route.netReceive * 0.99).toString(), // 1% slippage tolerance
        path: [] // Stellar will find path automatically
      })
    )
    .addMemo(Memo.text(`FXShopping:${route.routeId}`))
    .setTimeout(180)
    .build();

  return transaction.toXDR();
}
```

#### Step 3: Freighter Integration
```typescript
// lib/freighter-integration.ts
import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';

export async function connectFreighter(): Promise<string> {
  if (await isConnected()) {
    return await getPublicKey();
  }
  throw new Error('Freighter wallet not installed');
}

export async function signAndSubmitTransaction(
  xdr: string
): Promise<{ txHash: string; ledger: number }> {
  // Sign with Freighter
  const signedXDR = await signTransaction(xdr, {
    network: 'TESTNET',
    networkPassphrase: Networks.TESTNET,
  });

  // Submit to Horizon
  const server = new Server('https://horizon-testnet.stellar.org');
  const transaction = TransactionBuilder.fromXDR(signedXDR, Networks.TESTNET);

  const result = await server.submitTransaction(transaction);

  return {
    txHash: result.hash,
    ledger: result.ledger,
  };
}
```

#### Step 4: Update Routes Component
```typescript
// app/components/Routes.tsx
const handleSelectRoute = async (route: RouteQuote) => {
  try {
    // 1. Connect Freighter
    const publicKey = await connectFreighter();

    // 2. Build transaction
    const xdr = await buildPathPaymentTransaction(publicKey, route);

    // 3. Sign and submit
    const { txHash, ledger } = await signAndSubmitTransaction(xdr);

    // 4. Show success with explorer link
    alert(`Success! Transaction: ${txHash}\nView: https://stellar.expert/explorer/testnet/tx/${txHash}`);

  } catch (error) {
    alert(`Error: ${error.message}`);
  }
};
```

**Timeline:** 2-3 hours

**Prerequisites:**
1. User must have Freighter installed
2. User must have INRTEST in their wallet (need trustline)
3. User must have enough balance

---

## 🔮 5. Stellar Oracle Integration

### Current Best Options:

#### A. **Reflector Oracle** (Recommended)
- **URL:** https://reflector.stellar.expert
- **Data:** DEX trades, external sources
- **Coverage:** Major assets, crypto prices
- **Use Case:** General price feeds

**Implementation:**
```rust
// Soroban contract
use sep_40_oracle::Asset;

#[contractimpl]
impl Contract {
    pub fn get_price(env: Env, asset: Asset, decimals: u32) -> Option<i128> {
        // Query Reflector oracle
        reflector::lastprice(&env, &asset, &decimals)
    }
}
```

#### B. **LightEcho Oracle** (Best for Emerging Markets)
- **URL:** https://github.com/bp-ventures/lightecho-stellar-oracle
- **Data:** Emerging market currencies (INR, PHP, etc.)
- **Coverage:** Perfect for our use case!
- **Use Case:** INR/USD, PHP/USD rates

**Implementation:**
```typescript
// Query LightEcho contract on Soroban
const contract = new Contract(LIGHTECHO_CONTRACT_ID);
const inrUsdPrice = await contract.call('lastprice', {
  asset: 'INR:USD',
  decimals: 7
});
```

#### C. **DIA Oracles**
- **URL:** https://www.diadata.org
- **Data:** Asset prices, CEX/DEX rates
- **Coverage:** 3000+ assets
- **Use Case:** Backup option

**Timeline:** 3-4 hours to integrate

---

## 🤖 6. Smart Contracts (Soroban)

### Current State:
- ❌ No contracts deployed
- ❌ No attestation mechanism
- ❌ No on-chain proof

### What Should Be Implemented:

#### Contract #1: **Route Attestation Contract**
**Purpose:** Verify expected vs actual payout

```rust
// contracts/route-attestation/src/lib.rs
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, String, Address};

#[contracttype]
pub struct RouteAttestation {
    pub route_id: String,
    pub expected_receive: i128,
    pub actual_receive: i128,
    pub variance_percent: i32,
    pub timestamp: u64,
    pub user: Address,
}

#[contract]
pub struct RouteAttestationContract;

#[contractimpl]
impl RouteAttestationContract {
    // Called BEFORE transaction
    pub fn register_route(
        env: Env,
        route_id: String,
        expected_receive: i128,
        user: Address
    ) -> String {
        // Store expected amount
        // Return attestation hash
    }

    // Called AFTER transaction
    pub fn verify_route(
        env: Env,
        attestation_hash: String,
        actual_receive: i128
    ) -> RouteAttestation {
        // Compare expected vs actual
        // Store on-chain
        // Return attestation
    }

    // Query attestations
    pub fn get_attestation(env: Env, hash: String) -> Option<RouteAttestation> {
        // Retrieve from storage
    }
}
```

#### Contract #2: **Price Oracle Consumer**
```rust
// contracts/price-oracle/src/lib.rs
#[contractimpl]
impl PriceOracleConsumer {
    pub fn get_inr_usd_rate(env: Env) -> i128 {
        // Query LightEcho oracle
        let oracle_address = Address::from_string(&String::from_str(&env, LIGHTECHO_ORACLE_ID));
        let rate: i128 = env.invoke_contract(
            &oracle_address,
            &symbol_short!("lastprice"),
            vec![&env, "INR:USD".into_val(&env), 7_u32.into_val(&env)]
        );
        rate
    }
}
```

### Deployment Process:

```bash
# 1. Build contracts
cd contracts/route-attestation
soroban contract build

# 2. Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/route_attestation.wasm \
  --source SXXXXX... \
  --network testnet

# Returns: CXXXXXXXXXX... (contract ID)

# 3. Store contract ID
# Add to .env.local
NEXT_PUBLIC_ATTESTATION_CONTRACT_ID=CXXXXXXXXXX...
```

### UI Integration:

```typescript
// app/components/RouteComparison.tsx

// Show contract attestation status
{route.execution.contractAttestationSupported && (
  <div className="border-t pt-3">
    <div className="text-xs text-gray-600 mb-2">
      Smart Contract Attestation:
    </div>
    <div className="flex items-center space-x-2">
      <svg className="w-4 h-4 text-green-600">...</svg>
      <span className="text-xs text-green-700">
        Will be verified on-chain
      </span>
      {route.references?.contractHash && (
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${route.references.contractHash}`}
          className="text-xs text-blue-600 underline"
        >
          View Contract
        </a>
      )}
    </div>
  </div>
)}
```

### Transaction Flow with Contract:

```
1. User selects route
    ↓
2. Call contract.register_route()
    ↓ (returns attestation_hash)
3. Build path payment transaction
    ↓
4. Sign with Freighter
    ↓
5. Submit to Horizon
    ↓ (wait for confirmation)
6. Call contract.verify_route(attestation_hash, actual_amount)
    ↓
7. Show attestation proof in UI
    ↓ (link to stellar.expert)
8. User can verify on blockchain
```

**Timeline:** 4-5 hours

---

## 🎯 Recommended Implementation Order

### Phase 1: **Critical Path** (6-8 hours)
1. ✅ Audit complete (done)
2. 🔄 **Freighter Transaction Integration** (2-3 hours)
   - Build XDR transactions
   - Sign with Freighter
   - Submit to testnet
   - Show confirmation

3. 🔄 **UI Transparency Updates** (1 hour)
   - Add "SIMULATED" badges
   - Add "FROM TESTNET" indicators
   - Update disclaimers

### Phase 2: **Enhanced Realism** (4-6 hours)
4. 🔄 **Stellar Oracle Integration** (3-4 hours)
   - Use LightEcho for INR/PHP rates
   - Update anchor simulation with real rates
   - No more 1:1 assumption

5. 🔄 **Smart Contract Deployment** (2-3 hours)
   - Deploy attestation contract
   - Integrate with transaction flow
   - Show proofs in UI

### Phase 3: **Future Enhancements** (8-10 hours)
6. 🔄 **Real Anchor Integration** (4-5 hours)
   - SEP-24 implementation
   - KYC flow
   - Real fiat movement

7. 🔄 **Provider API Integration** (4-5 hours)
   - Wise API (if approved)
   - Aggregator services

---

## 📊 Summary Table

| Item | Current | Target | Priority | Time |
|------|---------|--------|----------|------|
| **Transaction Signing** | ❌ Alert | ✅ Freighter | HIGH | 2-3h |
| **UI Transparency** | ⚠️ Unclear | ✅ Clear Badges | HIGH | 1h |
| **INR/USD Conversion** | ❌ 1:1 Peg | ✅ Oracle Price | MEDIUM | 3-4h |
| **Smart Contracts** | ❌ None | ✅ Attestation | MEDIUM | 4-5h |
| **Provider Rates** | ✅ Estimated | ✅ Estimated | LOW | N/A |
| **Real Anchors** | ❌ Simulated | ✅ SEP-24 | LOW | 4-5h |

---

## ✅ Next Immediate Actions

**START HERE:**

1. **Implement Freighter Integration** (most critical)
   - Install dependencies
   - Build transaction XDR
   - Sign and submit
   - Show confirmation

2. **Update UI for Transparency**
   - Add badges
   - Update disclaimers
   - Show what's real vs simulated

3. **Deploy Simple Oracle Contract**
   - Use LightEcho for INR/PHP
   - Update anchor simulation
   - More realistic rates

Would you like me to start with **Freighter wallet integration** first?

---

*This plan provides a clear path from simulation to production-ready implementation.*
