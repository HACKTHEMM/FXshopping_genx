# Real-Time FX Shopping - API Integration Guide

This guide provides comprehensive instructions for configuring and obtaining API keys for all integrated services in the Real-Time FX Shopping application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Stellar Network Configuration](#stellar-network-configuration)
4. [MoneyGram Anchor Provider](#moneygram-anchor-provider)
5. [Freight Wallet Integration](#freight-wallet-integration)
6. [WalletConnect Configuration](#walletconnect-configuration)
7. [Error Handling & Fallbacks](#error-handling--fallbacks)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp env.example .env.local
   ```

2. **Fill in your API keys** (see sections below for obtaining keys)

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Verify configuration:**
   Visit `http://localhost:3000/api/health` to check service status

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Stellar Network (Required)
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_BASE_FEE=100

# MoneyGram API (Optional - for anchor provider features)
MONEYGRAM_API_KEY=your_moneygram_api_key_here
MONEYGRAM_API_URL=https://api.moneygram.com/v1
MONEYGRAM_CLIENT_ID=your_moneygram_client_id_here
MONEYGRAM_CLIENT_SECRET=your_moneygram_client_secret_here

# Freight Wallet (Optional - for wallet connection)
FREIGHT_WALLET_API_KEY=your_freight_wallet_api_key_here
FREIGHT_WALLET_API_URL=https://api.freightwallet.com/v1
FREIGHT_WALLET_CLIENT_ID=your_freight_wallet_client_id_here
FREIGHT_WALLET_REDIRECT_URI=http://localhost:3000/auth/callback

# WalletConnect (Optional - for multi-wallet support)
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

## Stellar Network Configuration

### Testnet Configuration (Default)

The application is configured to use Stellar testnet by default:

- **Horizon URL:** `https://horizon-testnet.stellar.org`
- **Network Passphrase:** `Test SDF Network ; September 2015`
- **Base Fee:** `100` stroops (0.00001 XLM)

### Mainnet Configuration

To use Stellar mainnet, update your `.env.local`:

```bash
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
STELLAR_BASE_FEE=100
```

### Getting Test XLM

For testnet development, you can get free test XLM from:

1. **Stellar Laboratory:** https://laboratory.stellar.org/#account-creator?network=test
2. **Friendbot:** Send a request to `https://friendbot.stellar.org/?addr=YOUR_ACCOUNT_ADDRESS`

## MoneyGram Anchor Provider

MoneyGram provides real-time FX quotes and off-chain payout services.

### Obtaining MoneyGram API Keys

1. **Visit MoneyGram Developer Portal:**
   - Go to: https://developer.moneygram.com/
   - Create an account or sign in

2. **Create a New Application:**
   - Navigate to "My Applications"
   - Click "Create New Application"
   - Fill in application details:
     - **Application Name:** "FX Shopping App"
     - **Description:** "Real-time FX shopping application"
     - **Redirect URI:** `http://localhost:3000/auth/callback`

3. **Get Your Credentials:**
   - **API Key:** Found in the "API Keys" section
   - **Client ID:** Found in the "OAuth" section
   - **Client Secret:** Found in the "OAuth" section (keep this secure!)

4. **Configure Environment Variables:**
   ```bash
   MONEYGRAM_API_KEY=mg_live_xxxxxxxxxxxxxxxxxxxxxxxx
   MONEYGRAM_CLIENT_ID=your_client_id_here
   MONEYGRAM_CLIENT_SECRET=your_client_secret_here
   ```

### MoneyGram API Features

- **Real-time Quotes:** Get live exchange rates
- **Fee Calculation:** Calculate transaction fees
- **Payout Confirmation:** Confirm off-chain payouts
- **KYC Integration:** Handle customer verification

### Testing MoneyGram Integration

```typescript
import { anchorManager } from './lib/anchor-integration';

// Get a quote
const quote = await anchorManager.getMoneyGramQuote('USD', 'PHP', 100);

// Get fees
const fees = await anchorManager.getMoneyGramFees('USD', 'PHP', 100);

// Confirm payout
const confirmation = await anchorManager.confirmMoneyGramPayout(
  'transaction_id',
  'confirmation_code'
);
```

## Freight Wallet Integration

Freight Wallet provides secure wallet connection and transaction signing capabilities.

### Obtaining Freight Wallet API Keys

1. **Visit Freight Wallet Developer Portal:**
   - Go to: https://developer.freightwallet.com/
   - Create an account or sign in

2. **Create a New Application:**
   - Navigate to "Applications"
   - Click "Create Application"
   - Fill in application details:
     - **App Name:** "FX Shopping"
     - **Description:** "Real-time FX shopping application"
     - **Website:** `http://localhost:3000`
     - **Redirect URI:** `http://localhost:3000/auth/callback`

3. **Get Your Credentials:**
   - **API Key:** Found in the "API Keys" section
   - **Client ID:** Found in the "OAuth" section
   - **Client Secret:** Generated after OAuth setup

4. **Configure Environment Variables:**
   ```bash
   FREIGHT_WALLET_API_KEY=fw_live_xxxxxxxxxxxxxxxxxxxxxxxx
   FREIGHT_WALLET_CLIENT_ID=your_client_id_here
   FREIGHT_WALLET_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

### Freight Wallet Features

- **OAuth Authentication:** Secure wallet connection
- **Transaction Signing:** Sign Stellar transactions
- **Balance Management:** View wallet balances
- **Multi-wallet Support:** Support for various wallet types

### Testing Freight Wallet Integration

```typescript
import { walletManager } from './lib/freight-wallet';

// Initialize OAuth flow
const authUrl = await walletManager.initializeOAuth();

// Exchange code for token (after OAuth callback)
await walletManager.exchangeCodeForToken(code, state);

// Get wallet balances
const balances = await walletManager.getBalances();

// Sign transaction
const signedTx = await walletManager.signTransaction(transaction);
```

## WalletConnect Configuration

WalletConnect enables multi-wallet support for broader compatibility.

### Obtaining WalletConnect Project ID

1. **Visit WalletConnect Cloud:**
   - Go to: https://cloud.walletconnect.com/
   - Create an account or sign in

2. **Create a New Project:**
   - Click "Create Project"
   - Fill in project details:
     - **Project Name:** "FX Shopping"
     - **Project Description:** "Real-time FX shopping application"
     - **Project URL:** `http://localhost:3000`

3. **Get Your Project ID:**
   - Copy the Project ID from the project dashboard
   - This is a public identifier (safe to use in frontend code)

4. **Configure Environment Variable:**
   ```bash
   WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

### WalletConnect Features

- **Multi-wallet Support:** Connect to various wallet types
- **Mobile Wallet Support:** QR code connection for mobile wallets
- **Session Management:** Persistent wallet connections
- **Event Handling:** Real-time wallet events

## Error Handling & Fallbacks

The application includes comprehensive error handling and fallback mechanisms:

### Service Availability Checks

```typescript
import { isServiceAvailable, getServiceConfig } from './lib/config';

// Check if MoneyGram is available
if (isServiceAvailable('moneygram')) {
  // Use MoneyGram features
} else {
  // Fall back to alternative or show limited functionality
}

// Get service configuration with error handling
try {
  const moneygramConfig = getServiceConfig('moneygram');
  // Use MoneyGram API
} catch (error) {
  if (error instanceof ServiceUnavailableError) {
    // Handle service unavailable
  }
}
```

### Configuration Validation

```typescript
import { validateConfig, getConfigStatus } from './lib/config';

// Validate configuration
const validation = validateConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}

// Get configuration status
const status = getConfigStatus();
console.log('Service status:', status);
```

### Fallback Strategies

1. **MoneyGram Unavailable:**
   - Fall back to Stellar-only routes
   - Use mock quotes for development
   - Show limited anchor provider options

2. **Freight Wallet Unavailable:**
   - Fall back to other wallet providers (Albedo, Ledger)
   - Use manual keypair input for testing
   - Show wallet connection alternatives

3. **WalletConnect Unavailable:**
   - Fall back to direct wallet integrations
   - Use browser extension detection
   - Provide manual connection options

## Production Deployment

### Environment Variables for Production

```bash
# Production Stellar (Mainnet)
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015

# Production API Keys
MONEYGRAM_API_KEY=mg_live_production_key
FREIGHT_WALLET_API_KEY=fw_live_production_key
WALLETCONNECT_PROJECT_ID=production_project_id

# Security
JWT_SECRET=your_secure_jwt_secret_here
ENCRYPTION_KEY=your_secure_32_byte_key_here

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Security Considerations

1. **Never commit `.env.local` to version control**
2. **Use strong, unique secrets for production**
3. **Rotate API keys regularly**
4. **Monitor API usage and set up alerts**
5. **Use HTTPS in production**
6. **Implement rate limiting**

### Deployment Checklist

- [ ] All API keys configured
- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Error monitoring set up
- [ ] API usage monitoring enabled
- [ ] Backup and recovery procedures in place

## Troubleshooting

### Common Issues

#### 1. "Service Unavailable" Errors

**Problem:** Services show as unavailable even with API keys configured.

**Solutions:**
- Verify API keys are correct and active
- Check API key permissions and scopes
- Ensure network connectivity
- Verify API endpoints are accessible

#### 2. OAuth Flow Issues

**Problem:** OAuth redirects not working properly.

**Solutions:**
- Verify redirect URI matches exactly
- Check client ID and secret
- Ensure HTTPS in production
- Verify OAuth scopes are correct

#### 3. Stellar Network Issues

**Problem:** Stellar transactions failing.

**Solutions:**
- Check network passphrase
- Verify account has sufficient XLM for fees
- Ensure account exists on the network
- Check for network congestion

#### 4. Configuration Validation Errors

**Problem:** Configuration validation failing.

**Solutions:**
- Check all required environment variables
- Verify API key formats
- Ensure encryption key is 32+ characters
- Check for typos in variable names

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=true
```

### Health Check Endpoint

Check service status at: `http://localhost:3000/api/health`

### Getting Help

1. **Check the logs** for detailed error messages
2. **Verify configuration** using the health check endpoint
3. **Test individual services** using the provided examples
4. **Check service documentation** for API-specific issues
5. **Contact support** for the respective services if needed

## Additional Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [MoneyGram Developer Portal](https://developer.moneygram.com/)
- [Freight Wallet Documentation](https://docs.freightwallet.com/)
- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Note:** This guide assumes you have basic knowledge of web development and API integration. For production use, ensure you follow security best practices and comply with all service terms of use.
