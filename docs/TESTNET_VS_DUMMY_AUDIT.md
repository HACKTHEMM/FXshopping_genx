# Testnet vs Dummy Data Audit

**Date:** October 10, 2025
**Purpose:** Identify what data comes from Stellar testnet vs what is simulated/dummy

---

## 🟢 What's REAL (On Stellar Testnet)

### 1. **Assets (INRTEST, USDTEST, etc.)**
- ✅ **Location:** Created by `scripts/setup-stellar-assets.js`
- ✅ **Issuer:** `GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC`
- ✅ **Assets Created:**
  - INRTEST (Indian Rupee Test)
  - USDTEST (US Dollar Test)
  - EURTEST (Euro Test)
  - PHPTEST (Philippine Peso Test)
- ✅ **Verification:** Can be queried on Horizon API
- ✅ **Trustlines:** Created via script

### 2. **Liquidity Pools / Offers**
- ✅ **Location:** Created by `scripts/setup-stellar-assets.js`
- ✅ **Trading Pairs:**
  - USDTEST ↔ INRTEST
  - USDTEST ↔ PHPTEST
  - USDTEST ↔ EURTEST
  - EURTEST ↔ INRTEST
  - EURTEST ↔ PHPTEST
  - PHPTEST ↔ INRTEST
- ✅ **Rates:** Based on real FX rates at time of creation
- ✅ **Liquidity:** 10,000 units per asset
- ✅ **Verification:** Can query via `/order_book` endpoint

### 3. **Path Payments**
- ✅ **Location:** `/api/stellar/find-paths/route.ts`
- ✅ **Data Source:** Horizon API `/paths/strict-send`
- ✅ **Real Data:**
  - Actual path discovery from Stellar DEX
  - Real orderbook data
  - Actual liquidity depth
  - Real exchange rates from on-chain offers
- ✅ **Fallback:** Orderbook analysis if no paths found

### 4. **Network Fees**
- ✅ **Location:** All transaction simulations
- ✅ **Fee Amount:** 100 stroops (0.00001 XLM)
- ✅ **Source:** Real Stellar network base fee
- ✅ **Verification:** Can confirm via Horizon API

### 5. **Exchange Rates (Base Rates)**
- ✅ **Location:** `/api/quotes/route.ts` via `lib/fx-rates.ts`
- ✅ **Data Source:** ExchangeRate-API (external, but REAL)
- ✅ **Real Data:**
  - Live market rates for 163 currencies
  - Updated daily
  - Mid-market rates (no markup)
- ✅ **Verification:** Can verify at exchangerate-api.com

---

## 🔴 What's DUMMY/SIMULATED

### 1. **Anchor Services (Fiat ↔ Token)**
- ❌ **Location:** `lib/anchor-simulation.ts`
- ❌ **What's Simulated:**
  - Deposit: INR (Bank) → INRTEST
  - Withdrawal: USDTEST → USD (Bank)
  - Fee calculations (0.2% deposit, 0.5% withdrawal)
  - Processing times (5min deposit, 1hr withdrawal)
- ❌ **Why Dummy:**
  - No real bank integration
  - No KYC process
  - No actual fiat movement
  - Instant "completion" (no real waiting)
- 🔄 **How to Make Real:**
  - Integrate with Vibrant anchor (vibrantapp.com) for INR/PHP
  - Use MoneyGram Access for USD
  - Implement SEP-24 interactive flow
  - Add KYC requirements

### 2. **Off-Chain Provider Quotes**
- ❌ **Location:** `/api/quotes/route.ts` via `lib/provider-fee-structures.ts`
- ❌ **What's Simulated:**
  - Wise quote generation
  - MoneyGram quote generation
  - Western Union quote generation
  - Remitly quote generation
- ❌ **Why Dummy:**
  - No real API calls to these providers
  - Fee structures from public pricing pages (static)
  - No real-time quote fetching
  - Estimates, not actual quotes
- 🔄 **How to Make Real:**
  - Integrate Wise API (requires partnership)
  - MoneyGram/Western Union don't have public APIs
  - Use aggregator services (e.g., TransferWise API)

### 3. **Transaction Signing**
- ❌ **Location:** Currently just alerts in `Routes.tsx`
- ❌ **What's Missing:**
  - No XDR transaction building
  - No Freighter wallet integration
  - No actual transaction submission
  - No transaction confirmation
- 🔄 **How to Make Real:**
  - Build XDR transaction with path payment
  - Request signature from Freighter
  - Submit to Horizon
  - Show transaction hash and status

### 4. **Smart Contracts (Soroban)**
- ❌ **Location:** Not implemented yet
- ❌ **What's Missing:**
  - Route attestation contract
  - Expected vs actual payout verification
  - On-chain proof of route execution
- 🔄 **How to Make Real:**
  - Deploy Soroban contract to testnet
  - Implement contract invocation
  - Store attestation on-chain
  - Show contract ID and attestation hash in UI

### 5. **Provider Reliability Scores**
- ❌ **Location:** `lib/provider-fee-structures.ts`
- ❌ **What's Simulated:**
  - Static reliability scores (0.88-0.99)
  - No real historical data
  - No actual success rate tracking
- 🔄 **How to Make Real:**
  - Track actual transaction success rates
  - Store historical data
  - Calculate real reliability metrics

---

## 📊 Data Flow Breakdown

### Current Flow:
```
User Input (Amount, Currencies)
    ↓
1. FX Rate API ✅ REAL (ExchangeRate-API)
    ↓
2. Anchor Deposit ❌ SIMULATED (lib/anchor-simulation.ts)
    ↓
3. Stellar Path Finding ✅ REAL (Horizon API)
    ↓
4. Provider Quotes ❌ SIMULATED (static fee structures)
    ↓
5. Route Comparison ✅ REAL (actual calculations)
    ↓
6. User Selection ❌ NO TRANSACTION (just alert)
```

### Target Real-World Flow:
```
User Input
    ↓
1. FX Rate API ✅ REAL
    ↓
2. Anchor Deposit ✅ REAL (Vibrant/MoneyGram SEP-24)
    ↓
3. Stellar Path Finding ✅ REAL (already real)
    ↓
4. Provider Quotes ✅ REAL (Wise API, aggregators)
    ↓
5. Smart Contract Attestation ✅ REAL (Soroban contract)
    ↓
6. Freighter Signing ✅ REAL (wallet integration)
    ↓
7. Transaction Execution ✅ REAL (submitted to testnet)
    ↓
8. Confirmation ✅ REAL (transaction hash, explorer link)
```

---

## 🎯 Priority Fixes

### HIGH PRIORITY (Core Functionality):

1. **✅ Implement Freighter Transaction Signing**
   - Build XDR for path payment
   - Request signature from Freighter
   - Submit to Horizon testnet
   - Show transaction status

2. **⚠️ Update UI Transparency**
   - Add "SIMULATED" badges to anchor steps
   - Add "ESTIMATED" badges to provider quotes
   - Show "LIVE FROM TESTNET" for Stellar paths
   - Add disclaimers

### MEDIUM PRIORITY (Enhanced Realism):

3. **🔄 Stellar Oracle Integration (SEP-40)**
   - Research Stellar price oracles
   - Use for INR/USD price feeds
   - More realistic than 1:1 peg assumption

4. **🔄 Vibrant Anchor Integration**
   - Use real anchor for INR ↔ INRTEST
   - Implement SEP-24 flow
   - Handle KYC requirements

### LOW PRIORITY (Nice-to-Have):

5. **📝 Smart Contract Deployment**
   - Deploy route attestation contract
   - Integrate with transaction flow
   - Show contract invocations in UI

6. **📊 Real Provider APIs**
   - Wise API integration (requires approval)
   - Use aggregator services

---

## 🔍 Quick Verification Commands

### Check Testnet Assets:
```bash
# Check if INRTEST exists
curl "https://horizon-testnet.stellar.org/accounts/GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC"

# Check offers
curl "https://horizon-testnet.stellar.org/offers?seller=GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC"

# Check orderbook
curl "https://horizon-testnet.stellar.org/order_book?selling_asset_type=credit_alphanum12&selling_asset_code=INRTEST&selling_asset_issuer=GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC&buying_asset_type=credit_alphanum12&buying_asset_code=USDTEST&buying_asset_issuer=GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC"
```

### Check FX Rate API:
```bash
curl "https://api.exchangerate-api.com/v4/latest/USD"
```

---

## 📋 Summary Table

| Component | Status | Data Source | Action Needed |
|-----------|--------|-------------|---------------|
| **Assets** | ✅ Real | Stellar Testnet | None |
| **Orderbook** | ✅ Real | Stellar Testnet | None |
| **Path Finding** | ✅ Real | Horizon API | None |
| **FX Rates** | ✅ Real | ExchangeRate-API | None |
| **Network Fees** | ✅ Real | Stellar Protocol | None |
| **Anchor Deposit** | ❌ Dummy | Simulation | Add SEP-24 / Oracle |
| **Anchor Withdrawal** | ❌ Dummy | Simulation | Add SEP-24 / Oracle |
| **Provider Quotes** | ❌ Dummy | Static Config | Add real APIs |
| **Transaction Signing** | ❌ Missing | N/A | Add Freighter |
| **Smart Contracts** | ❌ Missing | N/A | Deploy Soroban |

---

## 🎬 Next Steps

1. **Immediate:** Implement Freighter transaction signing
2. **Short-term:** Add UI transparency (SIMULATED badges)
3. **Medium-term:** Stellar Oracle for price feeds
4. **Long-term:** Real anchor integration (Vibrant)

---

*This audit provides full transparency on what's real vs simulated in the current implementation.*
