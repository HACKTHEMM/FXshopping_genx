#!/usr/bin/env node

/**
 * Configuration setup script for Real-Time FX Shopping
 * This script helps developers set up their environment configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  log('\n🚀 Real-Time FX Shopping - Configuration Setup', 'cyan');
  log('================================================', 'cyan');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const examplePath = path.join(process.cwd(), 'env.example');
  
  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('\n⚠️  .env.local already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      log('Configuration setup cancelled.', 'yellow');
      rl.close();
      return;
    }
  }
  
  // Check if env.example exists
  if (!fs.existsSync(examplePath)) {
    log('❌ env.example file not found. Please ensure it exists in the project root.', 'red');
    rl.close();
    return;
  }
  
  log('\n📋 Let\'s configure your environment variables:', 'bright');
  log('(Press Enter to use default values or skip optional configurations)\n', 'yellow');
  
  // Read the example file
  const exampleContent = fs.readFileSync(examplePath, 'utf8');
  let envContent = exampleContent;
  
  // Stellar Configuration
  log('🌟 Stellar Network Configuration:', 'blue');
  const stellarHorizonUrl = await question('Stellar Horizon URL (default: https://horizon-testnet.stellar.org): ');
  if (stellarHorizonUrl) {
    envContent = envContent.replace(
      'STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org',
      `STELLAR_HORIZON_URL=${stellarHorizonUrl}`
    );
  }
  
  const stellarNetwork = await question('Stellar Network Passphrase (default: Test SDF Network ; September 2015): ');
  if (stellarNetwork) {
    envContent = envContent.replace(
      'STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015',
      `STELLAR_NETWORK_PASSPHRASE=${stellarNetwork}`
    );
  }
  
  // MoneyGram Configuration
  log('\n💰 MoneyGram Anchor Provider Configuration:', 'blue');
  log('(Optional - Skip if you don\'t have MoneyGram API access)', 'yellow');
  
  const moneygramApiKey = await question('MoneyGram API Key: ');
  if (moneygramApiKey) {
    envContent = envContent.replace(
      'MONEYGRAM_API_KEY=your_moneygram_api_key_here',
      `MONEYGRAM_API_KEY=${moneygramApiKey}`
    );
  }
  
  const moneygramClientId = await question('MoneyGram Client ID: ');
  if (moneygramClientId) {
    envContent = envContent.replace(
      'MONEYGRAM_CLIENT_ID=your_moneygram_client_id_here',
      `MONEYGRAM_CLIENT_ID=${moneygramClientId}`
    );
  }
  
  const moneygramClientSecret = await question('MoneyGram Client Secret: ');
  if (moneygramClientSecret) {
    envContent = envContent.replace(
      'MONEYGRAM_CLIENT_SECRET=your_moneygram_client_secret_here',
      `MONEYGRAM_CLIENT_SECRET=${moneygramClientSecret}`
    );
  }
  
  // Freight Wallet Configuration
  log('\n🔐 Freight Wallet Configuration:', 'blue');
  log('(Optional - Skip if you don\'t have Freight Wallet API access)', 'yellow');
  
  const freightWalletApiKey = await question('Freight Wallet API Key: ');
  if (freightWalletApiKey) {
    envContent = envContent.replace(
      'FREIGHT_WALLET_API_KEY=your_freight_wallet_api_key_here',
      `FREIGHT_WALLET_API_KEY=${freightWalletApiKey}`
    );
  }
  
  const freightWalletClientId = await question('Freight Wallet Client ID: ');
  if (freightWalletClientId) {
    envContent = envContent.replace(
      'FREIGHT_WALLET_CLIENT_ID=your_freight_wallet_client_id_here',
      `FREIGHT_WALLET_CLIENT_ID=${freightWalletClientId}`
    );
  }
  
  // WalletConnect Configuration
  log('\n🔗 WalletConnect Configuration:', 'blue');
  log('(Optional - Skip if you don\'t have WalletConnect Project ID)', 'yellow');
  
  const walletConnectProjectId = await question('WalletConnect Project ID: ');
  if (walletConnectProjectId) {
    envContent = envContent.replace(
      'WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here',
      `WALLETCONNECT_PROJECT_ID=${walletConnectProjectId}`
    );
  }
  
  // Security Configuration
  log('\n🔒 Security Configuration:', 'blue');
  
  const jwtSecret = await question('JWT Secret (default: auto-generated): ');
  if (jwtSecret) {
    envContent = envContent.replace(
      'JWT_SECRET=your_jwt_secret_here',
      `JWT_SECRET=${jwtSecret}`
    );
  } else {
    // Generate a random JWT secret
    const randomSecret = require('crypto').randomBytes(32).toString('hex');
    envContent = envContent.replace(
      'JWT_SECRET=your_jwt_secret_here',
      `JWT_SECRET=${randomSecret}`
    );
  }
  
  const encryptionKey = await question('Encryption Key (default: auto-generated): ');
  if (encryptionKey) {
    envContent = envContent.replace(
      'ENCRYPTION_KEY=your_32_byte_encryption_key_here',
      `ENCRYPTION_KEY=${encryptionKey}`
    );
  } else {
    // Generate a random encryption key
    const randomKey = require('crypto').randomBytes(32).toString('hex');
    envContent = envContent.replace(
      'ENCRYPTION_KEY=your_32_byte_encryption_key_here',
      `ENCRYPTION_KEY=${randomKey}`
    );
  }
  
  // Application Configuration
  log('\n⚙️  Application Configuration:', 'blue');
  
  const appUrl = await question('Application URL (default: http://localhost:3000): ');
  if (appUrl) {
    envContent = envContent.replace(
      'NEXT_PUBLIC_APP_URL=http://localhost:3000',
      `NEXT_PUBLIC_APP_URL=${appUrl}`
    );
  }
  
  // Write the configuration file
  try {
    fs.writeFileSync(envPath, envContent);
    log('\n✅ Configuration saved to .env.local', 'green');
    
    // Show configuration summary
    log('\n📊 Configuration Summary:', 'bright');
    log('========================', 'bright');
    
    const hasMoneygram = moneygramApiKey && moneygramClientId && moneygramClientSecret;
    const hasFreightWallet = freightWalletApiKey && freightWalletClientId;
    const hasWalletConnect = walletConnectProjectId;
    
    log(`🌟 Stellar Network: ${stellarHorizonUrl || 'Testnet (default)'}`, 'green');
    log(`💰 MoneyGram: ${hasMoneygram ? 'Configured' : 'Not configured'}`, hasMoneygram ? 'green' : 'yellow');
    log(`🔐 Freight Wallet: ${hasFreightWallet ? 'Configured' : 'Not configured'}`, hasFreightWallet ? 'green' : 'yellow');
    log(`🔗 WalletConnect: ${hasWalletConnect ? 'Configured' : 'Not configured'}`, hasWalletConnect ? 'green' : 'yellow');
    log(`🔒 Security: JWT and Encryption keys generated`, 'green');
    
    log('\n🚀 Next Steps:', 'bright');
    log('1. Start the development server: npm run dev', 'cyan');
    log('2. Check service status: http://localhost:3000/api/health', 'cyan');
    log('3. Read the API Integration Guide: API_INTEGRATION_GUIDE.md', 'cyan');
    
    if (!hasMoneygram || !hasFreightWallet || !hasWalletConnect) {
      log('\n⚠️  Some services are not configured. The application will work with limited functionality.', 'yellow');
      log('Check the API Integration Guide for instructions on obtaining API keys.', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ Failed to save configuration: ${error.message}`, 'red');
  }
  
  rl.close();
}

// Handle script termination
process.on('SIGINT', () => {
  log('\n\nConfiguration setup cancelled.', 'yellow');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});
