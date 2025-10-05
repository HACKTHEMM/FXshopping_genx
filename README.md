# StellarFX Shopper - Intelligent Cross-Border Payment Platform

A real-time, intelligent cross-border payment platform that empowers users by dynamically finding and executing the best foreign exchange (FX) routes using the Stellar blockchain and off-chain FX providers. StellarFX Shopper combines Stellar's native path payment and asset gateway features with live off-chain FX quotes and anchor withdrawal costs to optimize the total net amount the recipient receives, transparently showing all fees and spreads.

## 🚀 Features

### Landing Page
- **Hero Section**: Compelling value proposition with "No hidden fees, no guesswork"
- **Interactive FAQ**: Expandable FAQ section with comprehensive answers
- **How It Works**: 3-step process explanation with visual guides
- **Call-to-Action**: Multiple conversion points throughout the page
- **Responsive Design**: Mobile-first approach with tablet and desktop optimizations

### Dashboard
- **Wallet Management**: View USDC balance with deposit/payout functionality
- **Savings Tracking**: Monitor Aave-based savings with growth projections
- **Visual Charts**: Interactive savings projection charts with time-based filtering
- **Real-time Data**: Live rate updates and transaction status
- **Responsive Layout**: Adaptive layouts for mobile, tablet, and desktop

### Transaction Management
- **Transaction History**: Comprehensive transaction listing with filtering
- **Transaction Types**: Support for wallet-to-payout, savings transfers, and deposits
- **Hash Tracking**: Blockchain transaction hash display with copy functionality
- **Time Filtering**: Filter by last 7, 30, 90 days or all time
- **Currency Support**: USDC, USD, and ETH filtering options

### Settings & Security
- **Password Management**: Secure password change functionality
- **Account Security**: Profile and security settings management
- **Form Validation**: Input validation and error handling
- **Responsive Forms**: Mobile-optimized form layouts

### Authentication
- **Login System**: Email/password authentication with social login options
- **Session Management**: Local storage-based authentication state
- **Social Integration**: Google and Twitter OAuth options
- **Security Features**: Password visibility toggles and validation

### Backend API
- **Route Search**: Find optimal payment routes across Stellar and FX providers
- **Payment Execution**: Execute payments through selected routes
- **Transaction Monitoring**: Real-time transaction status tracking
- **Multi-Provider Support**: Integration with Wise, Remitly, WorldRemit, and Stellar anchors
- **Route Optimization**: AI-powered route ranking by net recipient amount
- **Fee Transparency**: Complete fee breakdown for all payment methods
- **Health Monitoring**: System health checks and service status

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: Custom React components
- **Fonts**: 
  - PP Valve (Custom font family)
  - Inter (Google Fonts)
- **Icons**: Heroicons (SVG-based)
- **Build Tool**: Turbopack (Next.js built-in)

### Backend
- **API Framework**: Next.js API Routes
- **Blockchain Integration**: Stellar SDK 11.2.2
- **Network**: Stellar Testnet
- **Route Optimization**: Custom algorithm with multi-provider support
- **FX Providers**: Wise, Remitly, WorldRemit, Stellar Anchors
- **Real-time Data**: Stellar Horizon API integration

## 📁 Project Structure

```
FXshopping_genx/
├── app/                          # Next.js App Router directory
│   ├── api/                     # Backend API routes
│   │   ├── routes/              # Payment route APIs
│   │   │   ├── search/          # Route search endpoint
│   │   │   ├── execute/         # Payment execution endpoint
│   │   │   └── status/          # Transaction status endpoint
│   │   ├── currencies/          # Currency information endpoint
│   │   └── health/              # Health check endpoint
│   ├── components/              # Reusable React components
│   │   ├── Login.tsx           # Authentication component
│   │   ├── Navbar.tsx          # Navigation component
│   │   ├── PaymentExecution.tsx # Payment execution component
│   │   ├── RouteSearch.tsx     # Route search component
│   │   ├── Settings.tsx        # Settings and profile management
│   │   └── Transactions.tsx    # Transaction history component
│   ├── dashboard/              # Dashboard page
│   │   └── page.tsx           # Main dashboard implementation
│   ├── login/                  # Login page
│   │   └── page.tsx           # Login page wrapper
│   ├── payment/                # Payment page
│   │   └── page.tsx           # Payment execution page
│   ├── favicon.ico             # Site favicon
│   ├── globals.css             # Global styles and Tailwind imports
│   ├── layout.tsx              # Root layout component
│   └── page.tsx                # Landing page component
├── lib/                        # Utility libraries
│   ├── api-client.ts           # Frontend API client
│   ├── anchor-integration.ts   # MoneyGram anchor provider integration
│   ├── compliance-security.ts  # Compliance and security utilities
│   ├── config.ts               # Environment configuration management
│   ├── freight-wallet.ts       # Freight Wallet integration
│   ├── route-optimizer.ts      # Route optimization engine
│   ├── stellar.ts              # Stellar blockchain integration
│   └── streaming-service.ts    # Real-time streaming services
├── contracts/                  # Smart contracts (Rust)
│   ├── payment_rules.rs        # Payment rules contract
│   └── payment_rules_test.rs   # Contract tests
├── fonts/                      # Custom font files
│   ├── PPValve-PlainExtralight.otf
│   ├── PPValve-PlainExtralightItalic.otf
│   ├── PPValve-PlainMedium.otf
│   ├── PPValve-PlainMediumItalic.otf
│   ├── PPValve-PlainExtrabold.otf
│   ├── PPValve-PlainExtraboldItalic.otf
│   ├── PPValve-StencilExtralight.otf
│   ├── PPValve-StencilExtralightItalic.otf
│   ├── PPValve-StencilMedium.otf
│   ├── PPValve-StencilMediumItalic.otf
│   ├── PPValve-StencilExtrabold.otf
│   └── PPValve-StencilExtraboldItalic.otf
├── public/                     # Static assets
│   ├── file.svg               # File icon
│   ├── globe.svg              # Globe icon
│   ├── next.svg               # Next.js logo
│   ├── stellar-xlm-logo.png   # Stellar blockchain logo
│   ├── vercel.svg             # Vercel logo
│   └── window.svg             # Window icon
├── scripts/                    # Utility scripts
│   ├── deploy-contract.js      # Smart contract deployment
│   ├── setup-config.js         # Interactive configuration setup
│   ├── test-api.js             # API testing utilities
│   └── test-comprehensive.js   # Comprehensive testing suite
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── next-env.d.ts               # Next.js TypeScript declarations
├── package.json                # Dependencies and scripts
├── package-lock.json           # Dependency lock file
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
├── API_DOCUMENTATION.md        # Complete API documentation
├── API_INTEGRATION_GUIDE.md    # API integration setup guide
├── DEPLOYMENT_GUIDE.md         # Production deployment guide
├── IMPLEMENTATION_SUMMARY.md   # Technical implementation summary
├── env.example                 # Environment variables template
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FXshopping_genx
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks
- `npm run setup` - Interactive configuration setup
- `npm run health` - Check service health status
- `npm run test:api` - Test API endpoints

## 🎨 Design System

### Typography
- **Primary Font**: PP Valve (Custom font family)
- **Secondary Font**: Inter (Google Fonts)
- **Font Weights**: 200 (Extralight), 500 (Medium), 800 (Extrabold)

### Color Palette
- **Primary**: Blue (#2563eb)
- **Background**: White (#ffffff)
- **Text**: Black (#000000)
- **Accent**: Green (for savings/growth indicators)
- **Gray Scale**: Various gray shades for UI elements

### Layout Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Component Architecture
- **Responsive Design**: Mobile-first approach with progressive enhancement
- **Component Composition**: Modular, reusable React components
- **State Management**: React hooks for local state management
- **Type Safety**: Full TypeScript implementation

## 🔧 Configuration

### Next.js Configuration
The application uses Next.js 15 with Turbopack for fast development builds. Configuration is minimal and can be extended in `next.config.ts`.

### Tailwind CSS
Tailwind CSS 4 is configured with custom theme extensions and PostCSS processing. The design system enforces sharp corners globally for a modern, clean aesthetic.

### TypeScript
Strict TypeScript configuration with proper type definitions for all components and interfaces.

## 🌟 Key Features Implementation

### Responsive Design
- **Mobile Layout**: Stacked components with optimized touch targets
- **Tablet Layout**: Grid-based layouts with improved spacing
- **Desktop Layout**: Multi-column layouts with fixed and scrollable sections

### State Management
- **Authentication State**: Local storage-based session management
- **Form State**: Controlled components with validation
- **UI State**: Mobile menu toggles and modal states

### Performance Optimizations
- **Font Loading**: Optimized font loading with `display: swap`
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting with Next.js App Router

## 🔒 Security Features

- **Input Validation**: Client-side form validation
- **Password Security**: Secure password input with visibility toggles
- **Session Management**: Secure authentication state handling
- **XSS Protection**: React's built-in XSS protection

## 📱 Mobile Experience

The application is fully optimized for mobile devices with:
- Touch-friendly interface elements
- Responsive navigation with mobile menu
- Optimized form layouts
- Mobile-specific component arrangements

## 🔌 API Usage

### Search for Payment Routes
```typescript
import { apiClient } from '@/lib/api-client';

const routes = await apiClient.searchRoutes({
  sourceCurrency: 'USD',
  targetCurrency: 'INR',
  sourceAmount: 1000,
  sourceAccount: 'GCKFBEIYTKPQY5H...', // Optional
  targetAccount: 'GBKFBEIYTKPQY5H...' // Optional
});

console.log('Best route:', routes.routes[0]);
console.log('Total savings:', routes.summary.savings.vsWorst);
```

### Execute Payment
```typescript
const result = await apiClient.executePayment({
  routeId: routes.routes[0].id,
  sourceAccount: 'GCKFBEIYTKPQY5H...',
  targetAccount: 'GBKFBEIYTKPQY5H...',
  routeType: routes.routes[0].type,
  sourceCurrency: 'USD',
  targetCurrency: 'INR',
  sourceAmount: 1000,
  targetAmount: 83250,
  memo: 'Payment via StellarFX Shopper'
});

console.log('Transaction hash:', result.transaction.hash);
```

### Check Transaction Status
```typescript
const status = await apiClient.getTransactionStatus(
  undefined, // transactionId
  'a1b2c3d4e5f6789...' // transactionHash
);

console.log('Status:', status.transaction.status);
console.log('Explorer URL:', status.tracking.stellarExplorerUrl);
```

### Get Supported Currencies
```typescript
const currencies = await apiClient.getCurrencies();
console.log('Supported currencies:', currencies.currencies);
console.log('Exchange rates:', currencies.exchangeRates.rates);
```

## 🚀 Deployment

The application is ready for deployment on platforms like:
- **Vercel** (Recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Any Node.js hosting platform**

### Build for Production
```bash
npm run build
npm run start
```

### Environment Variables

#### Quick Setup
Run the interactive setup script:
```bash
npm run setup
```

#### Manual Configuration
Create a `.env.local` file with the following variables:

```env
# Stellar Network (Required)
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_BASE_FEE=100

# MoneyGram Anchor Provider (Optional)
MONEYGRAM_API_KEY=your_moneygram_api_key_here
MONEYGRAM_API_URL=https://api.moneygram.com/v1
MONEYGRAM_CLIENT_ID=your_moneygram_client_id_here
MONEYGRAM_CLIENT_SECRET=your_moneygram_client_secret_here

# Freight Wallet (Optional)
FREIGHT_WALLET_API_KEY=your_freight_wallet_api_key_here
FREIGHT_WALLET_API_URL=https://api.freightwallet.com/v1
FREIGHT_WALLET_CLIENT_ID=your_freight_wallet_client_id_here
FREIGHT_WALLET_REDIRECT_URI=http://localhost:3000/auth/callback

# WalletConnect (Optional)
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

#### Service Configuration
- **Stellar Network**: Configured for testnet by default (no API key required)
- **MoneyGram**: For real-time quotes and off-chain payouts
- **Freight Wallet**: For secure wallet connection and transaction signing
- **WalletConnect**: For multi-wallet support

See [API Integration Guide](./API_INTEGRATION_GUIDE.md) for detailed setup instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Stellar Development Foundation** for blockchain infrastructure
- **Next.js Team** for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Heroicons** for the beautiful icon set

## 📞 Support

For support, email support@lumenfx.com or join our community Discord.

---

**LumenFX** - Optimizing your money with transparent, blockchain-powered payments.