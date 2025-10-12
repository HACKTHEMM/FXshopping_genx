# LumenFX - Intelligent Cross-Border FX Payments

> **Smart route optimization platform for transparent, cost-effective international payments on Stellar blockchain**

LumenFX is a next-generation cross-border payment platform that aggregates multiple liquidity sources to find the most cost-effective routes for international money transfers. By comparing Stellar DEX paths against traditional FX providers, users can save 5-15% on cross-border payments with full transparency.

## 🌟 Key Features

- **Multi-Source Route Comparison**: Aggregates Stellar on-chain paths + off-chain FX providers
- **Transparent Fee Structure**: Shows all fees, spreads, and execution costs upfront
- **Smart Contract Attestation**: Immutable audit trail via Soroban smart contracts
- **Freighter Wallet Integration**: Secure transaction signing and key management
- **Real-time Rate Discovery**: Live price discovery across multiple liquidity sources
- **Cross-Chain Bridge Support**: Wormhole integration for multi-chain payments

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Blockchain**: Stellar Network (Testnet) + Soroban Smart Contracts
- **Wallet**: Freighter API integration
- **APIs**: Stellar Horizon API + Mock FX Provider endpoints
- **Smart Contracts**: Rust-based Soroban contracts for route attestation

### System Components

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ PaymentForm  │ →  │ RouteComparison │ →  │ Transaction Flow │
└──────────────┘    └─────────────────┘    └──────────────────┘
        │                     │                       │
        ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  • /api/routes/compare - Route aggregation & ranking       │
│  • /api/stellar/find-paths - Stellar path discovery        │
│  • /api/quotes - Mock FX provider quotes                   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│              Stellar Network Integration                    │
│  • Horizon API - Path payments & order books               │
│  • Soroban Contracts - Route attestation & verification    │
│  • Freighter Wallet - Transaction signing                  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- [Freighter Wallet](https://freighter.app/) browser extension
- Stellar testnet account with funded XLM

### Installation

```bash
# Clone the repository
git clone https://github.com/HACKTHEMM/FXshopping_genx.git
cd FXshopping_genx

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the LumenFX platform.

### Environment Setup

The platform runs on Stellar Testnet with test assets:
- `USDTEST` - US Dollar (Test)
- `EURTEST` - Euro (Test) 
- `INRTEST` - Indian Rupee (Test)
- `PHPTEST` - Philippine Peso (Test)

## 💡 How It Works

1. **Route Discovery**: Enter send/receive amounts and currencies
2. **Multi-Source Comparison**: Platform queries:
   - Stellar DEX paths via Horizon API
   - Mock FX provider quotes (SwiftFX, WiseTransfer, ExpressRemit)
3. **Intelligent Ranking**: Routes sorted by net receive amount
4. **Transparent Execution**: All fees, spreads, and execution steps shown
5. **Secure Transaction**: Sign with Freighter wallet
6. **On-Chain Attestation**: Results recorded in Soroban smart contract

## 📁 Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── routes/compare/       # Route comparison endpoint
│   │   ├── stellar/find-paths/   # Stellar path discovery
│   │   ├── quotes/               # FX provider quotes
│   │   ├── anchor/               # Anchor integration endpoints
│   │   ├── contract/             # Smart contract interaction APIs
│   │   ├── stellar/              # Stellar network APIs
│   │   └── wormhole/             # Cross-chain bridge APIs
│   ├── components/               # React components
│   │   ├── PaymentForm.tsx       # Payment input form
│   │   ├── RouteComparison.tsx   # Route comparison display
│   │   ├── Navbar.tsx            # Navigation component
│   │   ├── Login.tsx             # Authentication component
│   │   ├── WormholeBridge.tsx    # Cross-chain bridge UI
│   │   ├── TrustlineManager.tsx  # Asset trustline management
│   │   └── ...                   # Other UI components
│   ├── dashboard/                # Dashboard page
│   ├── cross-chain/              # Cross-chain bridge page
│   └── login/                    # Authentication page
├── contracts/                    # 🦀 Rust Soroban Smart Contracts
│   └── route-registry/           # Route attestation contract
│       ├── Cargo.toml            # Rust package manifest
│       ├── Cargo.lock            # Dependency lockfile
│       ├── src/
│       │   ├── lib.rs            # Main contract implementation
│       │   └── test.rs           # Contract unit tests
│       └── target/               # Compiled contract artifacts
├── lib/                          # Utility libraries
│   ├── types/route.ts            # TypeScript definitions
│   ├── stellar-transaction.ts    # Stellar integration
│   ├── freighter-integration.ts  # Wallet integration
│   ├── fx-rates.ts               # Rate calculations
│   ├── contract-client.ts        # Smart contract client
│   ├── anchor-simulation.ts      # Anchor protocol simulation
│   ├── stellar-trustlines.ts     # Trustline management
│   └── wormhole/                 # Cross-chain bridge utilities
│       ├── config.ts             # Wormhole configuration
│       ├── service.ts            # Bridge service layer
│       └── types.ts              # Wormhole type definitions
├── scripts/                      # Deployment & setup scripts
│   ├── deploy-route-registry-contract.sh    # Contract deployment (Unix)
│   ├── deploy-route-registry-contract.ps1   # Contract deployment (Windows)
│   ├── setup-stellar-assets.js             # Asset creation & setup
│   ├── fund-freighter-wallet.js            # Testnet funding
│   ├── create-high-liquidity-offers.js     # Market making
│   └── test-fx-rates.js                    # Rate testing utilities
└── docs/                         # Comprehensive documentation
    ├── MASTER_IMPLEMENTATION_PLAN.md       # Overall project plan
    ├── IMPLEMENTATION_SUMMARY.md           # Current status summary
    ├── SOROBAN_CONTRACT_GUIDE.md          # Smart contract guide
    ├── SMART_CONTRACT_DEPLOYMENT_GUIDE.md # Deployment instructions
    ├── FREIGHTER_TROUBLESHOOTING.md       # Wallet integration help
    └── TESTING_GUIDE.md                   # Testing procedures
```

### 🦀 Rust Smart Contract Details

The **Route Registry Contract** (`contracts/route-registry/`) is a Soroban smart contract written in Rust that provides:

#### Core Functionality
- **Route Registration**: Pre-execution registration of expected payment amounts
- **Execution Attestation**: Post-execution variance tracking and verification
- **Audit Trail**: Immutable on-chain record of all route executions
- **Variance Analytics**: Tracking of actual vs expected receive amounts

#### Contract Architecture
```rust
// Main contract structures
pub struct RouteData {
    route_id: String,
    expected_net: i128,
    actual_net: Option<i128>,
    sender: Address,
    registered_at: u64,
    finalized_at: Option<u64>,
    tx_hash: Option<BytesN<32>>,
    status: Symbol,
    variance: Option<i128>,
}

pub struct RouteAttestation {
    route_id: String,
    expected_receive: i128,
    actual_receive: i128,
    variance_percent: i32,
    timestamp: u64,
    user: Address,
    tx_hash: BytesN<32>,
}
```

#### Key Contract Methods
- `register_route()` - Register route before execution
- `finalize_route()` - Record actual execution results
- `get_route_data()` - Retrieve route information
- `get_attestations_by_user()` - Get user's route history
- `calculate_variance()` - Compute execution variance

#### Deployment & Testing
```bash
# Build contract
cd contracts/route-registry
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/route_registry.wasm

# Run tests
cargo test
```

## 🔧 API Endpoints

### Route Comparison
```http
POST /api/routes/compare
Content-Type: application/json

{
  "sendAmount": 1000,
  "sendCurrency": "USD",
  "receiveCurrency": "INR"
}
```

### Stellar Path Discovery
```http
GET /api/stellar/find-paths?sourceAsset=USDTEST:ISSUER&destAsset=INRTEST:ISSUER&amount=1000&type=send
```

## 🔐 Smart Contract Integration

LumenFX uses Soroban smart contracts for route attestation:

- **Route Registration**: Pre-execution route registration
- **Execution Attestation**: Post-execution variance tracking  
- **Audit Trail**: Immutable record of all route executions

Contract deployed on Stellar Testnet for transparent route verification.

## 📚 Documentation

Comprehensive documentation available in `/docs`:

- [Master Implementation Plan](docs/MASTER_IMPLEMENTATION_PLAN.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md) 
- [Smart Contract Guide](docs/SOROBAN_CONTRACT_GUIDE.md)
- [Testing Guide](docs/TESTING_GUIDE.md)

## 🐛 Troubleshooting

### Common Issues

**Smart contract error: Contract invocation failed: 500**
- Ensure Soroban contract is properly deployed
- Check testnet connectivity and account funding
- Verify Freighter wallet connection

**Freighter wallet signing failures**  
- Update Freighter to latest version
- Check wallet is unlocked and connected to testnet
- Verify sufficient XLM balance for transaction fees

See [Freighter Troubleshooting Guide](docs/FREIGHTER_TROUBLESHOOTING.md) for detailed solutions.

## 🚀 Deployment

### Development
```bash
npm run dev        # Start development server
npm run build      # Build for production  
npm run start      # Start production server
```

### Production
Deploy on [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) with automatic builds from GitHub.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [docs/](docs/)
- **Stellar Network**: [stellar.org](https://stellar.org)
- **Freighter Wallet**: [freighter.app](https://freighter.app)

---

*Built with ❤️ for the Stellar ecosystem - Making cross-border payments transparent and efficient*
