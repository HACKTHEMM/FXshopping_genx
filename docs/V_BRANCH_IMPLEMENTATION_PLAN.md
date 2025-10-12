# 🚀 V Branch - Production-Ready Implementation Plan

**Branch:** `v` (replicated from `dev`)
**Start Date:** October 10, 2025
**Estimated Timeline:** 8-12 hours
**Goal:** Transform half-baked implementation into production-ready FX route shopping platform

---

## 📊 Current State Analysis

### What Works ✅
- TypeScript type system with 9 interfaces
- Basic API routes structure (3 endpoints)
- UI components (PaymentForm, RouteComparison, Routes)
- Mock FX provider quotes (hardcoded rates)
- Stellar path discovery (basic Horizon integration)
- Script for creating testnet assets

### Critical Issues ❌

1. **Incomplete Fiat Flow**
   - Assumes user manually converts INR → INRTOKEN
   - Assumes user manually converts USDTOKEN → USD
   - No anchor integration for on/off ramping

2. **Mock Data Everywhere**
   - Hardcoded exchange rates in `app/api/quotes/route.ts` (lines 51-82)
   - No real FX rate API integration
   - Simulated liquidity seeding

3. **Poor Testnet Setup**
   - Script creates custom base32 encoding (reinventing the wheel)
   - Uses brittle manual transaction building
   - No proper environment variable management
   - Rates are hardcoded, not market-based

4. **Half-Baked On-Chain Discovery**
   - Path finding works but lacks proper asset resolution
   - No handling of real anchor assets
   - Orderbook fallback is rudimentary

5. **Off-Chain Provider Integration**
   - Completely mocked providers (SwiftFX, WiseTransfer, ExpressRemit)
   - No real API calls
   - Synthetic data generation with random variance

---

## 🎯 Implementation Goals

### 1. End-to-End Fiat Support
Replace "user converts manually" assumption with:
- **Option A:** Anchor simulation layer (SEP-24/SEP-38 compliant)
- **Option B:** Integration with Stellar testnet demo anchor (`testanchor.stellar.org`)
- Clear UI communication about fiat→token→fiat flow

### 2. Real FX Rate Integration
Replace hardcoded rates with:
- Free API integration (ExchangeRate-API, Currencylayer, or ForexRateAPI)
- Real-time rate fetching for liquidity seeding
- Caching layer (60s TTL) to avoid rate limits

###  3. Improved Testnet Setup
Replace custom script with:
- Proper `@stellar/stellar-sdk` usage
- Environment-based configuration
- Real FX rates for offer creation
- Better error handling and validation

### 4. Enhanced Path Discovery
- Integrate Stellar demo anchor assets if available
- Better orderbook depth analysis
- Support for SEP-38 quote protocol

### 5. Real Off-Chain Provider Simulation
- Use real FX rates as baseline
- Apply authentic fee structures from Wise, MoneyGram
- Optional: Wise API integration (if feasible for MVP)

---

## 🛠️ Implementation Phases

### Phase V1: Real FX Rate Integration (2 hours)
**Priority:** HIGH
**Dependencies:** None

#### V1.1: Select & Integrate FX Rate API
**Time:** 30 minutes

**Decision Matrix:**

| API | Free Tier | Update Frequency | Currencies | Best For |
|-----|-----------|------------------|------------|----------|
| **ExchangeRate-API** | 1500 req/month | Daily | 160+ | MVP (recommended) |
| **Currencylayer** | 250 req/month | Hourly (paid) | 168 | Backup option |
| **ForexRateAPI** | 100 req/month | 15min (paid) | 150+ | High-frequency needs |
| **Fixer.io** | 100 req/month | 60s updates | 170 | Real-time needs |

**Recommendation:** Use **ExchangeRate-API** (free, 1500 req/month, daily updates)

**Implementation:**

```typescript
// lib/fx-rates.ts (NEW FILE)
interface FXRates {
  base: string;
  rates: Record<string, number>;
  timestamp: Date;
  source: string;
}

class FXRateService {
  private cache: FXRates | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds
  private readonly API_URL = 'https://api.exchangerate-api.com/v4/latest';

  async getRates(baseCurrency: string = 'USD'): Promise<FXRates> {
    // Check cache
    if (this.cache && this.cache.base === baseCurrency && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    // Fetch fresh rates
    const response = await fetch(`${this.API_URL}/${baseCurrency}`);
    if (!response.ok) {
      throw new Error(`FX API error: ${response.status}`);
    }

    const data = await response.json();

    this.cache = {
      base: baseCurrency,
      rates: data.rates,
      timestamp: new Date(data.time_last_update_unix * 1000),
      source: 'ExchangeRate-API',
    };
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return this.cache;
  }

  async convert(from: string, to: string, amount: number): Promise<number> {
    const rates = await this.getRates(from);
    const rate = rates.rates[to];
    if (!rate) {
      throw new Error(`Rate not available for ${from}→${to}`);
    }
    return amount * rate;
  }

  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.getRates(from);
    return rates.rates[to] || 0;
  }
}

export const fxRateService = new FXRateService();
```

**Checklist:**
- [ ] Create `lib/fx-rates.ts`
- [ ] Implement FXRateService class with caching
- [ ] Add error handling for API failures
- [ ] Test with USD→INR, USD→PHP, USD→EUR conversions
- [ ] Add TypeScript types

#### V1.2: Update Quotes API
**File:** `app/api/quotes/route.ts`
**Time:** 30 minutes

**Changes:**
- Replace `MOCK_RATES` object with `fxRateService.getRates()`
- Keep provider fee structures (they're realistic)
- Update spread application to use real rates

```typescript
// Before (line 50-82)
const MOCK_RATES: Record<string, Record<string, number>> = {
  INR: { USD: 0.012, ... },
  // ...hardcoded
};

// After
import { fxRateService } from '@/lib/fx-rates';

// Inside GET handler:
const fxRates = await fxRateService.getRates(from);
const baseRate = fxRates.rates[to];
if (!baseRate) {
  return NextResponse.json({ error: `Rate unavailable for ${from}→${to}` }, { status: 400 });
}
```

**Checklist:**
- [ ] Import fxRateService
- [ ] Replace MOCK_RATES with API calls
- [ ] Update baseRate calculation
- [ ] Test all currency pairs (INR↔USD, USD↔PHP, etc.)
- [ ] Verify caching works (check console logs)

#### V1.3: Update Testnet Setup Script
**File:** `scripts/setup-stellar-assets.js`
**Time:** 1 hour

**Changes:**
- Fetch real FX rates for offer creation
- Update lines 207-215 with live rates
- Add rate fetch timestamp to console output

```javascript
// Add at top
const FX_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

async function fetchRealRates() {
  const response = await fetch(FX_API_URL);
  const data = await response.json();
  return {
    INR: data.rates.INR,
    PHP: data.rates.PHP,
    EUR: data.rates.EUR,
    timestamp: new Date(data.time_last_update_unix * 1000),
  };
}

// In main() function, before creating liquidity:
console.log('\n🌍 Fetching real-time FX rates...\n');
const realRates = await fetchRealRates();
console.log(`   ✅ Rates updated: ${realRates.timestamp.toISOString()}`);
console.log(`   1 USD = ${realRates.INR.toFixed(2)} INR`);
console.log(`   1 USD = ${realRates.PHP.toFixed(2)} PHP`);
console.log(`   1 USD = ${realRates.EUR.toFixed(4)} EUR\n`);

// Update pairs array (lines 208-215):
const pairs = [
  { base: 'USDTEST', quote: 'INRTEST', rate: realRates.INR },
  { base: 'USDTEST', quote: 'PHPTEST', rate: realRates.PHP },
  { base: 'USDTEST', quote: 'EURTEST', rate: realRates.EUR },
  { base: 'EURTEST', quote: 'INRTEST', rate: realRates.INR / realRates.EUR },
  { base: 'EURTEST', quote: 'PHPTEST', rate: realRates.PHP / realRates.EUR },
  { base: 'PHPTEST', quote: 'INRTEST', rate: realRates.INR / realRates.PHP },
];
```

**Checklist:**
- [ ] Add `fetchRealRates()` function
- [ ] Update pairs array with live rates
- [ ] Add timestamp logging
- [ ] Test script execution
- [ ] Verify offers created with correct rates on testnet

**Acceptance Criteria:**
- ✅ FX rates fetched from real API
- ✅ Rates cached for 60 seconds
- ✅ All APIs use real rates (not hardcoded)
- ✅ Testnet liquidity seeded with current market rates
- ✅ Rate source displayed in UI (optional)

---

### Phase V2: Anchor Integration/Simulation (3 hours)
**Priority:** HIGH
**Dependencies:** Phase V1

**Decision Point:** Real anchor vs simulation?

| Approach | Pros | Cons | Timeline |
|----------|------|------|----------|
| **Stellar Demo Anchor** (`testanchor.stellar.org`) | Real SEP-24 flow, Production-like | Requires KYC UI, Complex setup | 4-5 hours |
| **Simulated Anchor Layer** | Full control, Fast MVP | Not "real" blockchain, Less impressive | 2-3 hours |

**Recommendation:** Start with **Simulated Anchor Layer** for MVP, document path to real anchor integration.

#### V2.1: Create Anchor Simulation Layer
**File:** `lib/anchor-simulation.ts` (NEW)
**Time:** 1.5 hours

**Purpose:** Simulate fiat on/off ramp without actual bank integration

```typescript
export interface AnchorSimulation {
  type: 'deposit' | 'withdrawal';
  fiatCurrency: string;
  tokenCurrency: string;
  fiatAmount: number;
  tokenAmount: number;
  fees: {
    deposit: number;     // e.g., 0.5% of fiat amount
    withdrawal: number;  // e.g., 0.5% of fiat amount
    network: number;     // Stellar fee
  };
  estimatedTime: number; // seconds
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class AnchorSimulator {
  // Deposit: Fiat → Token
  async simulateDeposit(
    fiatCurrency: string,
    tokenCurrency: string,
    fiatAmount: number
  ): Promise<AnchorSimulation> {
    // 1:1 peg for demo tokens (INRTEST = INR, USDTEST = USD)
    const rate = 1;
    const depositFee = fiatAmount * 0.002; // 0.2% deposit fee
    const networkFee = 0.01; // 0.01 XLM (~$0.003)

    const tokenAmount = (fiatAmount - depositFee) * rate;

    return {
      type: 'deposit',
      fiatCurrency,
      tokenCurrency,
      fiatAmount,
      tokenAmount,
      fees: {
        deposit: depositFee,
        withdrawal: 0,
        network: networkFee,
      },
      estimatedTime: 300, // 5 minutes
      status: 'completed',
    };
  }

  // Withdrawal: Token → Fiat
  async simulateWithdrawal(
    tokenCurrency: string,
    fiatCurrency: string,
    tokenAmount: number
  ): Promise<AnchorSimulation> {
    const rate = 1; // 1:1 peg
    const withdrawalFee = tokenAmount * 0.005; // 0.5% withdrawal fee
    const networkFee = 0.01;

    const fiatAmount = (tokenAmount - withdrawalFee - networkFee) * rate;

    return {
      type: 'withdrawal',
      fiatCurrency,
      tokenCurrency,
      fiatAmount,
      tokenAmount,
      fees: {
        deposit: 0,
        withdrawal: withdrawalFee,
        network: networkFee,
      },
      estimatedTime: 3600, // 1 hour
      status: 'completed',
    };
  }

  // Check if anchor supports currency pair
  supportsCurrency(fiatCurrency: string): boolean {
    const supported = ['INR', 'USD', 'PHP', 'EUR'];
    return supported.includes(fiatCurrency.toUpperCase());
  }
}

export const anchorSimulator = new AnchorSimulator();
```

**Checklist:**
- [ ] Create `lib/anchor-simulation.ts`
- [ ] Implement `simulateDeposit()` and `simulateWithdrawal()`
- [ ] Add realistic fee structures
- [ ] Add TypeScript interfaces
- [ ] Test with all supported currencies

#### V2.2: Integrate Anchor Simulation into Route Comparison
**File:** `app/api/routes/compare/route.ts`
**Time:** 1 hour

**Update route generation to include explicit anchor legs:**

```typescript
import { anchorSimulator } from '@/lib/anchor-simulation';

// Inside POST handler, when building routes:

// 1. Add deposit leg (Fiat → Token)
if (sourceFiat && sourceFiat !== sourceAsset.code) {
  const depositSim = await anchorSimulator.simulateDeposit(
    sourceFiat,
    sourceAsset.code,
    sendAmount
  );

  legs.push({
    type: 'anchor-deposit',
    from: `${sourceFiat} (Bank Account)`,
    to: `${sourceAsset.code} (Stellar)`,
    rate: 1,
    estSeconds: depositSim.estimatedTime,
    fees: [{
      kind: 'anchor_deposit',
      amount: depositSim.fees.deposit,
      asset: sourceFiat,
      note: `Anchor deposit fee (0.2%)`,
    }],
    provider: 'Stellar Anchor (Simulated)',
    metadata: {
      isSimulated: true,
      realAnchorPath: 'SEP-24 compliant anchor integration available',
    },
  });
}

// 2. On-chain exchange legs (existing code)
// ...

// 3. Add withdrawal leg (Token → Fiat)
if (destFiat && destFiat !== destAsset.code) {
  const withdrawalSim = await anchorSimulator.simulateWithdrawal(
    destAsset.code,
    destFiat,
    finalTokenAmount
  );

  legs.push({
    type: 'anchor-withdraw',
    from: `${destAsset.code} (Stellar)`,
    to: `${destFiat} (Bank Account)`,
    rate: 1,
    estSeconds: withdrawalSim.estimatedTime,
    fees: [{
      kind: 'anchor_withdrawal',
      amount: withdrawalSim.fees.withdrawal,
      asset: destFiat,
      note: `Anchor withdrawal fee (0.5%)`,
    }],
    provider: 'Stellar Anchor (Simulated)',
    metadata: {
      isSimulated: true,
      realAnchorPath: 'SEP-24 compliant anchor integration available',
    },
  });

  finalAmount = withdrawalSim.fiatAmount;
}
```

**Checklist:**
- [ ] Import anchorSimulator
- [ ] Update deposit leg generation (lines 78-94)
- [ ] Update withdrawal leg generation (lines 107-124, 241-260)
- [ ] Add metadata to indicate simulation
- [ ] Test full fiat→token→token→fiat flow
- [ ] Verify fees calculated correctly

#### V2.3: Update UI to Show Anchor Steps
**File:** `app/components/RouteComparison.tsx`
**Time:** 30 minutes

**Add visual indicators for anchor steps:**
- Badge showing "Simulated Anchor" for demo
- Tooltip explaining what real anchor would do
- Link to SEP-24 documentation

**Checklist:**
- [ ] Add "Anchor (Simulated)" badge to legs
- [ ] Add tooltip with SEP-24 explanation
- [ ] Style anchor legs differently (e.g., dashed border)
- [ ] Add disclaimer footer

**Acceptance Criteria:**
- ✅ Routes show explicit deposit + exchange + withdrawal legs
- ✅ Anchor fees clearly displayed (0.2% deposit, 0.5% withdrawal)
- ✅ UI indicates simulation vs real anchor
- ✅ Full flow: INR (bank) → INRTOKEN → USDTOKEN → USD (bank)
- ✅ Net receive amount accounts for all fees

---

### Phase V3: Enhanced Path Discovery (2 hours)
**Priority:** MEDIUM
**Dependencies:** Phase V1, V2

#### V3.1: Improve Orderbook Analysis
**File:** `app/api/stellar/find-paths/route.ts`
**Time:** 1 hour

**Current issue:** Orderbook fallback (lines 109-152) only checks top ask

**Improvements:**
- Calculate liquidity depth (how much can be traded)
- Check spread (difference between best bid/ask)
- Return multiple paths with different liquidity tiers

```typescript
// Enhanced orderbook analysis
async function analyzeOrderbook(sourceAsset, destAsset, amount) {
  const orderbookUrl = `${HORIZON_URL}/order_book?...`;
  const response = await fetch(orderbookUrl);
  const data = await response.json();

  const asks = data.asks || [];
  const bids = data.bids || [];

  if (asks.length === 0) {
    return null;
  }

  // Calculate liquidity depth
  let cumulativeAmount = 0;
  let weightedRate = 0;
  const amountNeeded = parseFloat(amount);

  for (const ask of asks) {
    const askAmount = parseFloat(ask.amount);
    const askPrice = parseFloat(ask.price);

    if (cumulativeAmount >= amountNeeded) break;

    const usableAmount = Math.min(askAmount, amountNeeded - cumulativeAmount);
    weightedRate += usableAmount * askPrice;
    cumulativeAmount += usableAmount;
  }

  if (cumulativeAmount < amountNeeded) {
    return {
      available: cumulativeAmount,
      rate: weightedRate / cumulativeAmount,
      liquidityWarning: `Only ${cumulativeAmount} available, need ${amountNeeded}`,
    };
  }

  return {
    available: cumulativeAmount,
    rate: weightedRate / cumulativeAmount,
    spread: asks[0] && bids[0] ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)) : 0,
  };
}
```

**Checklist:**
- [ ] Create `analyzeOrderbook()` helper function
- [ ] Calculate weighted average rate across multiple orders
- [ ] Add liquidity depth warnings
- [ ] Add spread calculation
- [ ] Test with varying order sizes

#### V3.2: Add Path Quality Scoring
**Time:** 1 hour

**Add scoring to rank paths by:**
- Liquidity depth (higher = better)
- Number of hops (fewer = better)
- Spread (tighter = better)
- Historical reliability (if tracked)

```typescript
interface PathQuality {
  score: number; // 0-100
  liquidityDepth: number;
  hops: number;
  spread: number;
  reliability: number;
}

function calculatePathQuality(path): PathQuality {
  let score = 100;

  // Penalty for each hop
  score -= path.hops * 5;

  // Penalty for low liquidity
  if (path.liquidityDepth < 1000) score -= 20;
  else if (path.liquidityDepth < 10000) score -= 10;

  // Penalty for wide spread
  if (path.spread > 0.05) score -= 15; // >5% spread

  return {
    score: Math.max(0, score),
    liquidityDepth: path.liquidityDepth,
    hops: path.hops,
    spread: path.spread,
    reliability: 0.95, // Default, can be updated with historical data
  };
}
```

**Checklist:**
- [ ] Add `PathQuality` interface to types
- [ ] Implement `calculatePathQuality()` function
- [ ] Return quality score with each path
- [ ] Sort paths by quality score
- [ ] Display quality indicator in UI

**Acceptance Criteria:**
- ✅ Paths include liquidity depth analysis
- ✅ Paths ranked by quality score
- ✅ Warnings shown for low liquidity
- ✅ Spread calculated and displayed
- ✅ Handles cases where orderbook depth insufficient

---

### Phase V4: Real Provider Data (2-3 hours)
**Priority:** MEDIUM-LOW
**Dependencies:** Phase V1

**Options:**

| Integration | Complexity | Value | Recommendation |
|-------------|------------|-------|----------------|
| **Keep simulated with real rates** | Low | Medium | ✅ MVP |
| **Wise API (read-only)** | Medium | High | Post-MVP |
| **MoneyGram API** | High | High | Post-MVP |

**MVP Approach:** Use real FX rates + authentic fee structures from public sources

#### V4.1: Research Provider Fee Structures
**Time:** 30 minutes

**Task:** Document real fee structures from:
- Wise (wise.com/pricing)
- MoneyGram (moneygram.com/fees)
- Remitly, Western Union, etc.

**Create:** `lib/provider-fee-structures.ts`

```typescript
export const PROVIDER_FEE_STRUCTURES = {
  wise: {
    name: 'Wise',
    baseFeePercent: 0.45, // 0.45% average
    flatFee: 0, // Varies by corridor
    spreadPercent: 0.35, // Uses mid-market rate with small markup
    speedTier: 'medium',
    estimatedTime: 3600, // 1 hour typical
    reliability: 0.98,
  },
  moneygram: {
    name: 'MoneyGram',
    baseFeePercent: 0,
    flatFee: 5.0, // Typical flat fee
    spreadPercent: 2.5, // Higher exchange rate markup
    speedTier: 'fast',
    estimatedTime: 600, // 10 minutes
    reliability: 0.92,
  },
  westernunion: {
    name: 'Western Union',
    baseFeePercent: 0,
    flatFee: 8.0,
    spreadPercent: 3.0,
    speedTier: 'fast',
    estimatedTime: 300, // 5 minutes
    reliability: 0.95,
  },
  // Add more...
};
```

**Checklist:**
- [ ] Research Wise fee structure
- [ ] Research MoneyGram fees
- [ ] Research Western Union fees
- [ ] Create `provider-fee-structures.ts`
- [ ] Document sources in comments

#### V4.2: Update Quotes API with Real Fee Structures
**File:** `app/api/quotes/route.ts`
**Time:** 1 hour

**Replace:**
```typescript
const MOCK_PROVIDERS: MockProvider[] = [
  {
    id: 'provider-swift',
    name: 'SwiftFX',
    // ...made up values
  },
  // ...
];
```

**With:**
```typescript
import { PROVIDER_FEE_STRUCTURES } from '@/lib/provider-fee-structures';

const PROVIDERS = Object.entries(PROVIDER_FEE_STRUCTURES).map(([id, config]) => ({
  id,
  ...config,
}));
```

**Checklist:**
- [ ] Import fee structures
- [ ] Remove mock providers
- [ ] Update quote generation logic
- [ ] Test with real fee structures
- [ ] Verify calculations match provider websites

#### V4.3: Add Provider Comparison Documentation
**File:** `docs/PROVIDER_COMPARISON.md` (NEW)
**Time:** 30 minutes

**Content:**
- Table comparing all providers
- Fee breakdown examples
- Links to official pricing pages
- Notes on which routes each provider supports

**Acceptance Criteria:**
- ✅ Provider fees based on real data
- ✅ Fee sources documented
- ✅ Quotes reflect realistic costs
- ✅ Users can verify fees against provider websites

---

### Phase V5: Testing & Validation (2 hours)
**Priority:** HIGH
**Dependencies:** All previous phases

#### V5.1: End-to-End Flow Testing
**Time:** 1 hour

**Test Scenarios:**

1. **Full Fiat Flow**
   - [ ] INR 10,000 → USD (bank to bank)
   - [ ] Verify deposit fees applied
   - [ ] Verify exchange executed correctly
   - [ ] Verify withdrawal fees applied
   - [ ] Check final USD amount accuracy

2. **Multi-Hop Paths**
   - [ ] INR → PHP (via USD intermediate)
   - [ ] EUR → PHP (via USD intermediate)
   - [ ] Verify all legs execute correctly

3. **Edge Cases**
   - [ ] Zero liquidity path (should show warning)
   - [ ] Very large amount (exceeds orderbook depth)
   - [ ] Unsupported currency pair
   - [ ] FX API timeout (should use cached rates)

4. **Provider Comparison**
   - [ ] Compare Wise vs MoneyGram vs Stellar
   - [ ] Verify "best route" selection correct
   - [ ] Check savings calculation accuracy

#### V5.2: Performance Testing
**Time:** 30 minutes

**Metrics:**
- [ ] Route comparison response time < 3 seconds
- [ ] FX rate API response time < 500ms (or cached)
- [ ] Path discovery returns within 2 seconds
- [ ] UI renders smoothly with 5+ routes

#### V5.3: Documentation Updates
**Time:** 30 minutes

**Files to update:**
- [ ] README.md - Add setup instructions
- [ ] IMPLEMENTATION_SUMMARY.md - Document new architecture
- [ ] .env.example - Add required environment variables
- [ ] TESTING_GUIDE.md (NEW) - Test scenarios & expected outcomes

**Acceptance Criteria:**
- ✅ All test scenarios pass
- ✅ Performance metrics met
- ✅ Documentation complete and accurate
- ✅ No console errors in browser

---

## 🔧 Environment Configuration

### Required Environment Variables

Create `.env.local`:

```bash
# Stellar Network
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Stellar Assets (from setup script)
STELLAR_ISSUER_PUBLIC=G...
STELLAR_ISSUER_SECRET=S... # Keep secret, server-side only
STELLAR_DISTRIBUTOR_PUBLIC=G...
STELLAR_DISTRIBUTOR_SECRET=S... # Keep secret

# FX Rate API (optional - has free tier)
FX_RATE_API_KEY= # Leave empty for free tier

# Anchor Configuration (for future real anchor integration)
# ANCHOR_DOMAIN=testanchor.stellar.org
# ANCHOR_SEP24_URL=https://testanchor.stellar.org/sep24

# Optional: Security screening
# TRM_API_KEY= # For malicious address screening (Phase 2.5)
```

---

## 📊 Success Metrics

### MVP Completion Checklist

**Core Functionality:**
- [  ] Real FX rates integrated (not hardcoded)
- [ ] Anchor simulation layer working
- [ ] Full fiat→token→token→fiat flow functional
- [ ] Routes ranked correctly by net payout
- [ ] All fees transparent and accurate

**Quality Standards:**
- [ ] TypeScript compilation: 0 errors
- [ ] API response times < 3 seconds
- [ ] UI responsive and polished
- [ ] Error handling comprehensive
- [ ] Test coverage for critical paths

**Documentation:**
- [ ] Setup instructions clear
- [ ] Architecture documented
- [ ] Fee structures documented
- [ ] Testing guide available

---

## 🚀 Deployment Checklist

Before merging `v` branch to `dev`:

1. **Code Quality**
   - [ ] All TypeScript errors resolved
   - [ ] No console errors in browser
   - [ ] ESLint warnings addressed
   - [ ] Code formatted consistently

2. **Testing**
   - [ ] All E2E scenarios pass
   - [ ] Edge cases handled
   - [ ] Performance benchmarks met

3. **Documentation**
   - [ ] README updated
   - [ ] CHANGELOG created
   - [ ] API documentation complete

4. **Environment**
   - [ ] `.env.example` updated
   - [ ] Secrets not committed to git
   - [ ] Environment variables documented

---

## 📞 API Integration Details

### ExchangeRate-API

**Free Tier:**
- 1500 requests/month
- Daily rate updates
- 160+ currencies
- No credit card required

**Endpoint:**
```
GET https://api.exchangerate-api.com/v4/latest/USD
```

**Response:**
```json
{
  "provider": "https://www.exchangerate-api.com",
  "terms": "https://www.exchangerate-api.com/terms",
  "base": "USD",
  "date": "2025-10-10",
  "time_last_updated": 1728604800,
  "rates": {
    "INR": 83.5,
    "PHP": 56.2,
    "EUR": 0.92,
    ...
  }
}
```

**Rate Limits:**
- Free tier: ~50 requests/day
- Caching reduces actual requests to ~24/day
- Upgrade path available if needed

---

## 🔄 Future Enhancements (Post-V Branch)

### Real Anchor Integration
- Integrate with Stellar testnet demo anchor
- Implement SEP-24 deposit/withdrawal UI
- Add KYC simulation flow
- Test with real Stellar anchors

### Advanced Features
- Historical rate tracking & charts
- User route preferences (speed vs cost)
- Route bookmarking
- Transaction history
- Price alerts

### Provider Integrations
- Wise API (official integration)
- MoneyGram API (if accessible)
- Additional providers (Remitly, Azimo, etc.)

### Smart Contract Enhancements
- Deploy malicious address screening (Phase 2.5)
- Add route attestation
- Performance analytics on-chain

---

## 🐛 Known Limitations

### Current (V Branch)
1. **Anchor Simulation**
   - Not a real bank integration
   - 1:1 peg assumed (no slippage)
   - Instant confirmations (unrealistic)

2. **Provider Quotes**
   - Fees based on public research (may vary)
   - No real-time API integration with providers
   - Simulated execution times

3. **Testnet Liquidity**
   - Limited orderbook depth
   - May not match mainnet conditions
   - Rates can drift from real market

### Mitigations
- Clear UI indicators for simulations
- Documentation of limitations
- Path to real integrations documented

---

**Status:** 🟢 Ready to Execute
**Next Step:** Begin Phase V1 - Real FX Rate Integration

Let's transform this into a production-ready platform! 🚀
