# StellarFX Shopper - Comprehensive Deployment Guide

This guide provides step-by-step instructions for deploying the StellarFX Shopper platform to production, including all components: Stellar Horizon integration, Freight Wallet integration, anchor services, Soroban contracts, and compliance systems.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Stellar Horizon API Integration](#stellar-horizon-api-integration)
4. [Freight Wallet Integration](#freight-wallet-integration)
5. [Anchor Integration Setup](#anchor-integration-setup)
6. [Soroban Contract Deployment](#soroban-contract-deployment)
7. [Compliance & Security Configuration](#compliance--security-configuration)
8. [API Server Deployment](#api-server-deployment)
9. [Frontend Deployment](#frontend-deployment)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Testing & Validation](#testing--validation)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18+ 
- Rust 1.70+ (for Soroban contracts)
- Docker (optional, for containerized deployment)
- Git

### Stellar Requirements
- Stellar account with XLM for transaction fees
- Access to Stellar Horizon API (testnet/mainnet)
- Soroban CLI tools

### Third-Party Services
- Freight Wallet SDK access
- Anchor provider accounts (SEP-24/SEP-31)
- KYC/AML service provider
- Monitoring service (optional)

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd FXshopping_genx

# Install Node.js dependencies
npm install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Soroban CLI
cargo install --locked soroban-cli
```

### 2. Environment Variables

Create `.env.local` file:

```env
# Stellar Configuration
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# For mainnet deployment:
# STELLAR_NETWORK=mainnet
# STELLAR_HORIZON_URL=https://horizon-mainnet.stellar.org
# STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015

# API Configuration
NEXT_PUBLIC_API_BASE_URL=/api
API_PORT=3000

# Wallet Configuration
FREIGHT_WALLET_ENABLED=true
ALBEDO_WALLET_ENABLED=true
LEDGER_WALLET_ENABLED=true

# Anchor Configuration
ANCHOR_TIMEOUT=30000
ANCHOR_RETRY_ATTEMPTS=3

# Compliance Configuration
ENABLE_KYC=true
ENABLE_AML=true
ENABLE_AUDIT_LOGGING=true
MAX_TRANSACTION_AMOUNT=1000000
REQUIRE_APPROVAL_THRESHOLD=10000

# Security Configuration
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# Database Configuration (if using external DB)
DATABASE_URL=postgresql://user:password@localhost:5432/stellarfx
REDIS_URL=redis://localhost:6379

# Monitoring Configuration
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## Stellar Horizon API Integration

### 1. Configure Horizon Connection

The Horizon integration is already configured in `lib/stellar.ts`. Verify the connection:

```bash
# Test Horizon connection
npm run test:api
```

### 2. Implement Retry Logic

The retry mechanism is already implemented with exponential backoff:

```typescript
// lib/stellar.ts
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};
```

### 3. Enable Streaming

Real-time streaming is configured in `lib/streaming-service.ts`:

```typescript
// Start streaming service
import { streamingService } from './lib/streaming-service';

streamingService.start();

// Subscribe to payment events
const subscriptionId = streamingService.subscribeToPayments(
  accountId,
  (event) => {
    console.log('Payment received:', event);
  }
);
```

## Freight Wallet Integration

### 1. Install Freight Wallet SDK

```bash
npm install @freight-wallet/sdk
```

### 2. Configure Wallet Manager

Update `lib/freight-wallet.ts` with real Freight Wallet integration:

```typescript
import { FreightWallet } from '@freight-wallet/sdk';

export class FreightWalletManager {
  private freightWallet: FreightWallet;

  constructor() {
    this.freightWallet = new FreightWallet({
      network: process.env.STELLAR_NETWORK,
      appName: 'StellarFX Shopper'
    });
  }

  async connectWallet(): Promise<WalletConnection> {
    const connection = await this.freightWallet.connect();
    return {
      publicKey: connection.publicKey,
      isConnected: true,
      network: process.env.STELLAR_NETWORK,
      walletType: 'freight'
    };
  }
}
```

### 3. Add Wallet UI Components

Create wallet connection components in your frontend:

```typescript
// components/WalletConnection.tsx
import { walletManager } from '../lib/freight-wallet';

export function WalletConnection() {
  const [connection, setConnection] = useState(null);

  const connectWallet = async () => {
    try {
      const conn = await walletManager.connectWallet();
      setConnection(conn);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <button onClick={connectWallet}>
      {connection ? 'Connected' : 'Connect Wallet'}
    </button>
  );
}
```

## Anchor Integration Setup

### 1. Configure Anchor Providers

Update `lib/anchor-integration.ts` with real anchor domains:

```typescript
// Add real anchor domains
const REAL_ANCHORS = [
  'anchor.example.com',
  'moneygram.com',
  'circle.com',
  // Add more real anchors
];

export async function getAnchorsForCurrency(currency: string): Promise<AnchorInfo[]> {
  const anchors: AnchorInfo[] = [];
  
  for (const domain of REAL_ANCHORS) {
    try {
      const anchorInfo = await this.loadAnchorInfo(domain);
      if (anchorInfo.currencies.some(c => c.code === currency)) {
        anchors.push(anchorInfo);
      }
    } catch (error) {
      console.warn(`Failed to load anchor ${domain}:`, error);
    }
  }
  
  return anchors;
}
```

### 2. Implement SEP-24/SEP-31 Endpoints

Create anchor-specific API endpoints:

```typescript
// app/api/anchors/[domain]/deposit/route.ts
export async function POST(request: NextRequest, { params }: { params: { domain: string } }) {
  const { domain } = params;
  const body = await request.json();
  
  try {
    const depositInfo = await anchorManager.getDepositInfo(
      domain,
      body.asset,
      body.account,
      body.memo
    );
    
    return NextResponse.json(depositInfo);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get deposit info' },
      { status: 500 }
    );
  }
}
```

### 3. Set Up Webhook Handlers

Create webhook endpoints for anchor notifications:

```typescript
// app/api/webhooks/anchor/[domain]/route.ts
export async function POST(request: NextRequest, { params }: { params: { domain: string } }) {
  const { domain } = params;
  const body = await request.json();
  
  // Verify webhook signature
  const signature = request.headers.get('x-signature');
  if (!verifyWebhookSignature(body, signature, domain)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Process webhook
  await processAnchorWebhook(domain, body);
  
  return NextResponse.json({ success: true });
}
```

## Soroban Contract Deployment

### 1. Build the Contract

```bash
# Build the Soroban contract
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Verify the WASM file was created
ls target/wasm32-unknown-unknown/release/payment_rules.wasm
```

### 2. Deploy to Testnet

```bash
# Deploy using the deployment script
node scripts/deploy-contract.js

# Or deploy manually using Soroban CLI
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_rules.wasm \
  --source-account <DEPLOYER_ACCOUNT> \
  --network testnet
```

### 3. Initialize the Contract

```bash
# Initialize the contract with admin account
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source-account <ADMIN_ACCOUNT> \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ACCOUNT>
```

### 4. Deploy to Mainnet

For mainnet deployment:

1. Update environment variables to mainnet
2. Ensure you have sufficient XLM for deployment fees
3. Run the deployment script with mainnet configuration
4. Verify deployment on Stellar Explorer

## Compliance & Security Configuration

### 1. Configure KYC/AML Services

Update `lib/compliance-security.ts` with real KYC/AML providers:

```typescript
// Add real KYC/AML service integration
import { KYCProvider } from '@kyc-provider/sdk';
import { AMLProvider } from '@aml-provider/sdk';

export class ComplianceManager {
  private kycProvider: KYCProvider;
  private amlProvider: AMLProvider;

  constructor() {
    this.kycProvider = new KYCProvider({
      apiKey: process.env.KYC_API_KEY,
      environment: process.env.NODE_ENV
    });
    
    this.amlProvider = new AMLProvider({
      apiKey: process.env.AML_API_KEY,
      environment: process.env.NODE_ENV
    });
  }

  async checkKYCStatus(accountId: string): Promise<KYCResult> {
    return await this.kycProvider.checkStatus(accountId);
  }

  async performAMLCheck(accountId: string): Promise<AMLResult> {
    return await this.amlProvider.screen(accountId);
  }
}
```

### 2. Set Up Audit Logging

Configure audit logging to external service:

```typescript
// lib/audit-logger.ts
import { AuditLogger } from '@audit-service/sdk';

export class AuditLogger {
  private logger: AuditLogger;

  constructor() {
    this.logger = new AuditLogger({
      apiKey: process.env.AUDIT_API_KEY,
      endpoint: process.env.AUDIT_ENDPOINT
    });
  }

  async logEvent(event: AuditLogEntry): Promise<void> {
    await this.logger.log(event);
  }
}
```

### 3. Implement Rate Limiting

Add rate limiting middleware:

```typescript
// middleware/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function rateLimit(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
}
```

## API Server Deployment

### 1. Build the Application

```bash
# Build for production
npm run build

# Verify build
npm run start
```

### 2. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add STELLAR_NETWORK
vercel env add STELLAR_HORIZON_URL
# ... add all required environment variables
```

### 3. Deploy to Other Platforms

#### AWS Amplify
```bash
# Configure AWS Amplify
amplify init
amplify add hosting
amplify publish
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t stellarfx-shopper .
docker run -p 3000:3000 stellarfx-shopper
```

## Frontend Deployment

### 1. Configure Environment Variables

Update `next.config.ts`:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.STELLAR_NETWORK,
    NEXT_PUBLIC_HORIZON_URL: process.env.STELLAR_HORIZON_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  images: {
    domains: ['stellar.expert', 'flagcdn.com'],
  },
};

module.exports = nextConfig;
```

### 2. Optimize for Production

```typescript
// Add performance optimizations
const nextConfig = {
  // ... existing config
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
};
```

### 3. Set Up CDN

Configure CDN for static assets:

```typescript
// next.config.ts
const nextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.yourdomain.com' 
    : '',
};
```

## Monitoring & Maintenance

### 1. Set Up Monitoring

```typescript
// lib/monitoring.ts
import { init, captureException } from '@sentry/nextjs';

init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

export function logError(error: Error, context?: any) {
  console.error('Error:', error);
  captureException(error, { extra: context });
}
```

### 2. Health Checks

Create health check endpoints:

```typescript
// app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: { status: 'healthy', latency: 0 },
      stellar: await checkStellarHealth(),
      database: await checkDatabaseHealth(),
    }
  };
  
  return NextResponse.json(health);
}
```

### 3. Set Up Alerts

Configure alerts for:
- High error rates
- Slow response times
- Failed transactions
- Compliance violations
- Security events

## Testing & Validation

### 1. Run Comprehensive Tests

```bash
# Run the comprehensive test suite
node scripts/test-comprehensive.js

# Run unit tests
npm test

# Run integration tests
npm run test:integration
```

### 2. Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery run load-tests.yml
```

### 3. Security Testing

```bash
# Run security audit
npm audit

# Run penetration testing
npm run security-test
```

## Troubleshooting

### Common Issues

#### 1. Horizon API Connection Issues
```bash
# Check Horizon server status
curl https://horizon-testnet.stellar.org/

# Verify network configuration
echo $STELLAR_NETWORK
echo $STELLAR_HORIZON_URL
```

#### 2. Wallet Connection Problems
- Ensure Freight Wallet extension is installed
- Check browser console for errors
- Verify network configuration

#### 3. Contract Deployment Failures
```bash
# Check account balance
soroban account get <ACCOUNT_ID> --network testnet

# Verify contract compilation
cargo check --target wasm32-unknown-unknown
```

#### 4. Anchor Integration Issues
- Verify anchor domains are accessible
- Check SEP-1 stellar.toml files
- Ensure proper CORS configuration

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
DEBUG=stellar:*
```

### Support

For additional support:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the [README](./README.md)
- Open an issue on GitHub
- Contact the development team

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Stellar Horizon API accessible
- [ ] Freight Wallet integration tested
- [ ] Anchor providers configured
- [ ] Soroban contracts deployed
- [ ] KYC/AML services integrated
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up
- [ ] Security audit completed
- [ ] Load testing passed
- [ ] Backup procedures in place
- [ ] Incident response plan ready
- [ ] Documentation updated
- [ ] Team training completed

## Maintenance Schedule

### Daily
- Monitor system health
- Check error logs
- Verify transaction processing

### Weekly
- Review compliance reports
- Update exchange rates
- Check anchor provider status

### Monthly
- Security audit
- Performance optimization
- Update dependencies
- Review and update documentation

---

**Note**: This deployment guide provides a comprehensive overview. Always test thoroughly in a staging environment before deploying to production. Keep your deployment secure and up-to-date with the latest security patches and best practices.