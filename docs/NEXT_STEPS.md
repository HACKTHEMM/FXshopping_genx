# StellarFX Shopper - Next Steps & Development Roadmap

## Project Status

✅ **Completed:**
- Frontend architecture with Next.js
- Dashboard page implementation
- Transactions page with Horizon testnet integration
- Freighter wallet connection
- Basic UI/UX components

---

## How Stellar Is Used (Hackathon Focus)

This project intentionally exercises multiple core primitives of the Stellar network plus Soroban smart contracts. Where real-world anchors (e.g. INR) are unavailable, we simulate those layers while keeping all on-chain settlement real on testnet.

### Core Stellar Components
1. Path Payments (strict-send & strict-receive) for multi-hop routing.
2. Horizon order books (& AMM pool stats if present) to derive implied FX rates.
3. Issued demo assets (e.g. `INRTEST`, `USDTEST`, `PHPTEST`) minted from controlled issuer accounts to represent anchor tokens.
4. Freighter wallet for key management & transaction signing.
5. Soroban smart contract (RouteRegistry) for immutable route attestation & optional variance logging.
6. Transaction submission + explorer deep links for transparency.
7. Base fee + reserve awareness surfaced to user.
8. Simulated SEP-38 quote aggregation + simulated SEP-24 deposit / withdrawal flow.

### Demonstration Flow
1. User inputs source fiat (e.g. INR) and destination fiat (e.g. USD) amount.
2. Backend discovers on-chain paths (e.g. `INRTEST -> XLM -> USDC`, `INRTEST -> EURTEST -> USDC`).
3. Mock provider quotes + on-chain synthetic rates aggregated.
4. Routes ranked by net receive (after spreads, network fees, anchor withdrawal, slippage buffer, time).
5. User selects a route; optional contract attestation call stores route hash.
6. Path payment XDR built & signed in Freighter; submitted to testnet.
7. Confirmation + explorer links displayed; analytics updated.

### Why It Still Qualifies as Cross-Border / FX “Shopping”
- Competes multiple liquidity sources & quote providers, not a single opaque path.
- Exposes full fee composition and savings vs baseline route.
- Anchor-ready modular design: replacing mocks with real SEP endpoints needs only adapter swaps.
- On-chain audit layer (Soroban) adds verifiability beyond traditional APIs.

### Fiat Gap Simulation Strategy
| Real Layer | Hackathon Substitute | Rationale |
|------------|----------------------|-----------|
| Bank deposit (INR→token) | Mint `INRTEST` to user testnet account | Demonstrates tokenized representation |
| SEP-38 quotes | Aggregated mock providers + on-chain synthetic mid | Shows optimization engine |
| Anchor withdrawal (USD token→bank) | Simulated leg with flat + % fee + ETA | Displays downstream cost impact |
| KYC / Compliance | Boolean flags on routes | Communicates production readiness path |

### RouteQuote Data Model (Summary)
See: New API section below for TypeScript interface (to be implemented in `lib/types/route.ts`).

### Soroban Contract Plan
Contract: RouteRegistry
- `register_route(route_id, expected_net, sender)` stores route metadata & emits event.
- `finalize_route(route_id, tx_hash, actual_net)` records outcome & variance.
- Query accessor `get_route(route_id)`.
Optional extension: FeeLedger for aggregated fee tracking.

### Judge-Facing Proof Points
- Live path discovery calls (inspectable in Network tab / logs).
- Real testnet asset issuers & trustlines.
- Freighter-signed transaction hashes resolvable in explorer.
- Soroban contract ID + emitted events.
- Clear delta: naive vs optimized route net receive.

### UI Disclaimer Snippet
"Some fiat on/off-ramp steps are simulated for hackathon scope. All path discovery, settlement, and contract attestations run on Stellar testnet. Architecture is anchor-ready."

---

## Development Roadmap

---

## Phase 1: Backend API Development (Priority: HIGH)

### 1.1 Stellar Horizon Integration APIs
**Timeline:** 3-5 days

- [ ] **Create API route for Path Payment Discovery**
  - File: `app/api/stellar/find-paths/route.ts`
  - Query Stellar Horizon's `/paths/strict-send` and `/paths/strict-receive` endpoints
  - Accept parameters: source currency, destination currency, amount, sender address
  - Return: Array of possible payment paths with intermediate assets

- [ ] **Create API route for Live Order Book Data**
  - File: `app/api/stellar/orderbook/route.ts`
  - Fetch real-time order book data for currency pairs
  - Calculate best bid/ask spreads
  - Return: Current market rates and liquidity information

- [ ] **Create API route for Transaction Fee Estimation**
  - File: `app/api/stellar/fees/route.ts`
  - Query current base fee from Horizon
  - Calculate total transaction cost including path payment operations
  - Return: Detailed fee breakdown

- [ ] **Create API route for Transaction Submission**
  - File: `app/api/stellar/submit-payment/route.ts`
  - Accept signed transaction XDR from frontend
  - Submit to Stellar testnet via Horizon
  - Return: Transaction hash and confirmation status

### 1.2 Off-Chain FX Provider Integration
**Timeline:** 4-6 days

- [ ] **Research and Select FX API Providers**
  - Evaluate providers: CurrencyLayer, Fixer.io, XE.com API, or build mock service
  - Consider rate limits, coverage, and cost

- [ ] **Create Mock FX Provider Service (Phase 1)**
  - File: `app/api/fx-providers/mock/route.ts`
  - Simulate 3-5 different FX providers with varying rates and fees
  - Include realistic spreads and anchor withdrawal costs
  - Return: Provider quotes with total cost breakdown

- [ ] **Create Real FX Provider Integration (Phase 2)**
  - File: `app/api/fx-providers/live/route.ts`
  - Integrate with chosen real FX API(s)
  - Handle rate caching (refresh every 30-60 seconds)
  - Implement error handling and fallbacks

- [ ] **Create Anchor Withdrawal Fee API**
  - File: `app/api/anchors/fees/route.ts`
  - Query or mock withdrawal fees for various Stellar anchors
  - Support multiple currency corridors
  - Return: Anchor-specific fee structures

### 1.3 Route Optimization Engine
**Timeline:** 5-7 days

- [ ] **Build Route Aggregation Service**
  - File: `lib/route-optimizer.ts`
  - Aggregate routes from both on-chain (Stellar paths) and off-chain (FX providers)
  - Normalize data structure for comparison

- [ ] **Implement Route Ranking Algorithm**
  - Calculate net payout for each route: `Net Payout = Destination Amount - All Fees - Spread Costs`
  - Factor in:
    - Stellar base fees
    - Path payment conversion losses
    - FX provider spreads
    - Anchor withdrawal fees
    - Estimated execution time
  - Rank routes by best net payout

- [ ] **Create Route Comparison API**
  - File: `app/api/routes/compare/route.ts`
  - Accept: source currency, destination currency, amount
  - Return: Ranked array of routes with detailed breakdown
  - Include: provider name, fees, exchange rate, net payout, estimated time

---

## Phase 2: Frontend Enhancement (Priority: HIGH)

### 2.1 FX Route Discovery Interface
**Timeline:** 3-4 days

- [ ] **Create Payment Initiation Component**
  - File: `app/components/PaymentForm.tsx`
  - Input fields: Send amount, source currency, destination currency, recipient address
  - Currency selector with supported pairs
  - Real-time validation

- [ ] **Create Route Comparison Component**
  - File: `app/components/RouteComparison.tsx`
  - Display ranked routes in card/table format
  - Show: Provider logo, exchange rate, fees, net payout, savings vs worst route
  - Visual indicators for best route
  - Expandable detail view for each route

- [ ] **Create Fee Breakdown Component**
  - File: `app/components/FeeBreakdown.tsx`
  - Transparent display of:
    - Network fees
    - Provider spreads
    - Anchor withdrawal costs
    - Total cost
  - Visual chart/graph of fee composition

### 2.2 Payment Execution Flow
**Timeline:** 3-4 days

- [ ] **Build Route Selection & Confirmation**
  - User selects preferred route
  - Show final confirmation modal with all details
  - "Execute Payment" button

- [ ] **Integrate Freighter Wallet for Transaction Signing**
  - Build transaction with selected route parameters
  - Request signature from Freighter
  - Handle user approval/rejection

- [ ] **Create Payment Status Tracking**
  - File: `app/components/PaymentStatus.tsx`
  - Show real-time status: Pending → Signing → Submitting → Confirmed
  - Display transaction hash with link to Stellar Explorer
  - Success/error messaging

### 2.3 Payment History & Analytics
**Timeline:** 2-3 days

- [ ] **Enhance Transactions Page**
  - Show payment history with route used
  - Display savings achieved per transaction
  - Filter by currency pair, date range, status

- [ ] **Create Analytics Dashboard**
  - File: `app/components/Analytics.tsx`
  - Total volume sent
  - Total fees saved
  - Most used routes
  - Charts for payment trends

---

## Phase 3: Smart Contract Development (Priority: MEDIUM)

### 3.1 Soroban Smart Contracts
**Timeline:** 7-10 days

- [ ] **Set Up Soroban Development Environment**
  - Install Rust and Soroban CLI
  - Create project structure: `/contracts` directory
  - Configure for Stellar testnet

- [ ] **Build Route Finalization Contract**
  - File: `contracts/route-finalizer/src/lib.rs`
  - Accept route parameters and execute payment
  - Verify source/destination accounts
  - Return execution status

- [ ] **Build Fee Accounting Contract**
  - File: `contracts/fee-manager/src/lib.rs`
  - Track and log all fees charged
  - Provide fee transparency on-chain
  - Allow fee queries

- [ ] **Build Compliance & Escrow Contract (Optional)**
  - Implement multi-sig or time-locked escrow for large payments
  - Add basic compliance checks
  - Handle dispute resolution

- [ ] **Deploy and Test Contracts**
  - Deploy to Soroban testnet
  - Write integration tests
  - Create contract invocation endpoints in backend

---

## Phase 4: Testing & Optimization (Priority: HIGH)

### 4.1 End-to-End Testing
**Timeline:** 3-4 days

- [ ] **Test Complete Payment Flows**
  - Multiple currency corridors (INR→USD, USD→PHP, EUR→INR)
  - Different payment amounts
  - Various route selections

- [ ] **Wallet Integration Testing**
  - Freighter wallet signing
  - Transaction submission and confirmation
  - Error handling (insufficient funds, network errors)

- [ ] **API Performance Testing**
  - Load test route discovery endpoints
  - Optimize slow queries
  - Implement caching strategies

### 4.2 Error Handling & Edge Cases
**Timeline:** 2-3 days

- [ ] **Implement Comprehensive Error Handling**
  - Network failures
  - Insufficient liquidity
  - Wallet connection issues
  - Transaction failures

- [ ] **Add Loading States & User Feedback**
  - Skeleton loaders
  - Progress indicators
  - Toast notifications

---

## Phase 5: Demo Preparation & Polish (Priority: MEDIUM)

### 5.1 Demo Features
**Timeline:** 2-3 days

- [ ] **Create Demo Mode with Pre-Seeded Data**
  - Populate with sample routes and transactions
  - Allow demo without wallet connection

- [ ] **Build Onboarding Tutorial**
  - Step-by-step guide for first payment
  - Tooltips explaining key features

- [ ] **Create Presentation Materials**
  - Demo script
  - Key metrics dashboard
  - Video walkthrough

### 5.2 Documentation
**Timeline:** 2-3 days

- [ ] **API Documentation**
  - Document all backend endpoints
  - Request/response examples

- [ ] **User Guide**
  - File: `USER_GUIDE.md`
  - How to connect wallet
  - How to execute payments
  - FAQ section

- [ ] **Technical Architecture Document**
  - File: `ARCHITECTURE.md`
  - System design diagrams
  - Data flow explanations
  - Technology stack details

---

## Phase 6: Deployment & Production Readiness (Priority: LOW)

### 6.1 Deployment
**Timeline:** 2-3 days

- [ ] **Deploy to Vercel/Production**
  - Configure environment variables
  - Set up continuous deployment
  - Configure custom domain

- [ ] **Testnet to Mainnet Migration Plan**
  - Document differences
  - Security audit checklist
  - Gradual rollout strategy

### 6.2 Monitoring & Analytics
**Timeline:** 1-2 days

- [ ] **Set Up Application Monitoring**
  - Error tracking (Sentry)
  - Performance monitoring
  - Usage analytics

---

## Immediate Next Steps (Start Here)
### Week 1 Priorities (Revised for Stellar Emphasis):
1. Issue demo assets (`INRTEST`, `USDTEST`) & seed minimal offers (or mock liquidity module).
2. Implement `GET /api/stellar/find-paths` + order book helper.
3. Implement `GET /api/quotes` (3 mock providers + on-chain synthetic baseline).
4. Implement `POST /api/routes/compare` returning ranked `RouteQuote[]`.
5. Build `RouteComparison` UI + fee breakdown + savings delta + disclaimer component.
6. Implement XDR builder endpoint + Freighter signing integration.
7. Scaffold & deploy Soroban RouteRegistry; store contract ID; implement `register_route` call.

### Week 2 Priorities:
1. Add risk scoring + slippage heuristics.
2. Implement `finalize_route` flow post-confirmation.
3. Add simulated deposit/withdraw legs & KYC flags in UI.
4. Build analytics dashboard (cumulative savings & average effective rate).
5. Add Payment Status timeline + explorer deep links.

### Week 3 Priorities:
1. Optional FeeLedger contract + integration.
2. Performance tuning & caching (quotes + paths + order books).
3. Demo polish: onboarding overlay + architecture diagram asset.
4. Unit & integration tests for optimizer + contract adapter.
5. Presentation materials (slides: problem, architecture, live demo flow, roadmap).

---

## Technical Dependencies to Install

```bash
# Stellar SDK
npm install @stellar/stellar-sdk

# For Freighter wallet integration
npm install @stellar/freighter-api

# For Soroban (Smart Contracts)
npm install @stellar/stellar-sdk soroban-client

# For API development
npm install axios swr

# For UI enhancements
npm install recharts lucide-react
```

---

## Key Resources

- **Stellar Documentation:** https://developers.stellar.org/
- **Horizon API Reference:** https://developers.stellar.org/api/horizon
- **Soroban Documentation:** https://developers.stellar.org/docs/smart-contracts
- **Freighter Wallet:** https://www.freighter.app/docs
- **Stellar Laboratory (Testing):** https://laboratory.stellar.org/

---

## Success Metrics

By completion, the project should demonstrate:
- ✅ Discovery of 3+ routes per payment request
- ✅ < 3 second response time for route comparison
- ✅ Successful payment execution with 95%+ success rate
- ✅ Fee transparency with detailed breakdown
- ✅ Cost savings of 5-15% vs single-provider routing
- ✅ Support for 3+ currency corridors

---

## Risk Mitigation

**Potential Challenges:**
1. **Limited testnet liquidity** - Use mock data or seed test accounts
2. **FX API rate limits** - Implement aggressive caching
3. **Wallet integration complexity** - Start with Freighter, add others later
4. **Soroban learning curve** - Begin with simple contracts, iterate

**Fallback Plans:**
- If Soroban is too time-consuming, defer to post-demo enhancement
- If real FX APIs are unavailable, use realistic mocks for demo
- If Horizon API is slow, implement aggressive frontend caching

---

## Contact & Collaboration

**Questions or blockers?** Document them in `BLOCKERS.md` and prioritize resolution.

**Ready to start?** Begin with Phase 1.1 - Stellar Horizon Integration APIs.

---

*Last Updated: October 5, 2025*
*Project: StellarFX Shopper*
*Repository: FXshopping_genx*
