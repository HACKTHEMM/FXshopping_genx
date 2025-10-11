// scripts/verify-setup.js
/**
 * Verification script for Wormhole integration setup
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

async function verifySetup() {
  console.log('🔍 Verifying Wormhole Integration Setup...\n');

  // Check environment variables
  const requiredEnvVars = [
    'ETHEREUM_RPC_URL',
    'ETHEREUM_PRIVATE_KEY',
    'STELLAR_PRIVATE_KEY'
  ];

  console.log('📋 Checking Environment Variables:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value && !value.includes('YOUR_') && !value.includes('_HERE')) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Not set or placeholder value`);
    }
  });

  // Test Ethereum connection
  if (process.env.ETHEREUM_RPC_URL && !process.env.ETHEREUM_RPC_URL.includes('YOUR_')) {
    try {
      console.log('\n🔷 Testing Ethereum Connection:');
      const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      const network = await provider.getNetwork();
      console.log(`✅ Connected to: ${network.name} (Chain ID: ${network.chainId})`);
      
      if (process.env.ETHEREUM_PRIVATE_KEY && !process.env.ETHEREUM_PRIVATE_KEY.includes('your_')) {
        const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        console.log(`✅ Wallet Address: ${wallet.address}`);
        console.log(`✅ Balance: ${ethers.formatEther(balance)} ETH`);
      }
    } catch (error) {
      console.log(`❌ Ethereum connection failed: ${error.message}`);
    }
  }

  // Test Stellar connection
  if (process.env.STELLAR_PRIVATE_KEY && !process.env.STELLAR_PRIVATE_KEY.includes('your_')) {
    try {
      console.log('\n🌟 Testing Stellar Connection:');
      const StellarSDK = require('stellar-sdk');
      const keypair = StellarSDK.Keypair.fromSecret(process.env.STELLAR_PRIVATE_KEY);
      console.log(`✅ Stellar Address: ${keypair.publicKey()}`);
      
      const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(keypair.publicKey());
      console.log(`✅ Account exists and loaded`);
    } catch (error) {
      if (error.message.includes('Account not found') || error.message.includes('Not Found')) {
        console.log(`⚠️  Stellar account exists but needs funding`);
        console.log(`   Get testnet XLM from: https://www.stellar.org/laboratory/#account-creator`);
        console.log(`   Address: GC5Y2NRKTQ42FYUCHXKO2UFEDFBO2EHQDYQQ3U5QU52E6DWHI7WEN445`);
      } else {
        console.log(`❌ Stellar connection failed: ${error.message}`);
      }
    }
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Fill in your actual private keys in .env.local');
  console.log('2. Get testnet tokens (XLM and ETH)');
  console.log('3. Test real transactions with small amounts');
  console.log('4. Monitor transaction status on block explorers');
}

verifySetup().catch(console.error);
