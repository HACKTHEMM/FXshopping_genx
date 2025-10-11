/**
 * Quick Testnet Setup Script
 * Creates a valid testnet issuer for demo purposes
 */

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

async function createTestnetIssuer() {
  try {
    // Try to use stellar-sdk if available
    const StellarSdk = require('@stellar/stellar-sdk');
    
    console.log('🚀 Creating testnet issuer for demo...\n');
    
    // Create issuer account
    const issuer = StellarSdk.Keypair.random();
    console.log(`📝 Issuer Public Key: ${issuer.publicKey()}`);
    console.log(`🔑 Issuer Secret Key: ${issuer.secret()}\n`);
    
    // Fund issuer
    console.log('💰 Funding issuer account...');
    const response = await fetch(`${FRIENDBOT_URL}?addr=${issuer.publicKey()}`);
    if (response.ok) {
      console.log('✅ Issuer funded successfully\n');
    } else {
      console.log('❌ Failed to fund issuer\n');
      return;
    }
    
    // Wait for funding to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 UPDATE YOUR PaymentForm.tsx:\n');
    console.log(`Replace this line:`);
    console.log(`const TESTNET_ISSUER = 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC';`);
    console.log(`\nWith:`);
    console.log(`const TESTNET_ISSUER = '${issuer.publicKey()}';`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔧 Or add to your .env.local:');
    console.log(`STELLAR_TESTNET_ISSUER="${issuer.publicKey()}"`);
    console.log(`STELLAR_TESTNET_ISSUER_SECRET="${issuer.secret()}"\n`);
    
    console.log('✨ Setup complete! The issuer is now valid on testnet.');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ @stellar/stellar-sdk not found');
      console.log('\n📝 Manual setup instructions:\n');
      console.log('1. Install SDK: npm install @stellar/stellar-sdk --legacy-peer-deps');
      console.log('2. Run this script again: node scripts/create-testnet-issuer.js\n');
      console.log('Or use the Stellar Laboratory: https://laboratory.stellar.org/#account-creator?network=test');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

createTestnetIssuer().catch(console.error);
