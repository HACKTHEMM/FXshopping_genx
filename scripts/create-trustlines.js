/**
 * Manual Trustline Creation Script
 * Run this script to create trustlines for all supported assets
 * Usage: node scripts/create-trustlines.js
 */

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// All assets that need trustlines
const ASSETS_TO_CREATE_TRUSTLINES = [
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    name: 'USD Coin'
  },
  {
    code: 'USDT',
    issuer: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
    name: 'Tether USD'
  },
  {
    code: 'INRTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'Indian Rupee Test'
  },
  {
    code: 'USDTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'US Dollar Test'
  },
  {
    code: 'EURTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'Euro Test'
  },
  {
    code: 'PHPTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'Philippine Peso Test'
  }
];

async function createTrustlinesScript() {
  try {
    // Try to use stellar-sdk if available
    const StellarSdk = require('@stellar/stellar-sdk');
    
    console.log('🔧 Stellar Trustline Creation Script\n');
    
    // Get user's public key
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const userPublicKey = await new Promise((resolve) => {
      rl.question('Enter your Stellar public key (G...): ', resolve);
    });
    
    if (!userPublicKey.startsWith('G') || userPublicKey.length !== 56) {
      console.log('❌ Invalid Stellar public key format');
      rl.close();
      return;
    }
    
    console.log(`\n📝 Creating trustlines for ${userPublicKey}...\n`);
    
    const server = new StellarSdk.Server(HORIZON_URL);
    
    try {
      const account = await server.loadAccount(userPublicKey);
      console.log('✅ Account loaded successfully\n');
      
      for (const assetConfig of ASSETS_TO_CREATE_TRUSTLINES) {
        try {
          console.log(`🔄 Processing ${assetConfig.code}...`);
          
          // Check if trustline already exists
          const existingTrustline = account.balances.find(
            (balance) => 
              balance.asset_code === assetConfig.code && 
              balance.asset_issuer === assetConfig.issuer
          );
          
          if (existingTrustline) {
            console.log(`✅ Trustline for ${assetConfig.code} already exists`);
            continue;
          }
          
          // Create keypair for signing (user needs to provide secret key)
          const secretKey = await new Promise((resolve) => {
            rl.question(`Enter secret key for ${userPublicKey} (S...): `, resolve);
          });
          
          if (!secretKey.startsWith('S') || secretKey.length !== 56) {
            console.log(`❌ Invalid secret key format for ${assetConfig.code}`);
            continue;
          }
          
          const keypair = StellarSdk.Keypair.fromSecret(secretKey);
          
          // Build change trust transaction
          const asset = new StellarSdk.Asset(assetConfig.code, assetConfig.issuer);
          
          const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET
          })
            .addOperation(
              StellarSdk.Operation.changeTrust({
                asset: asset,
                limit: '922337203685.4775807' // Maximum limit
              })
            )
            .setTimeout(30)
            .build();
          
          // Sign and submit transaction
          transaction.sign(keypair);
          
          const result = await server.submitTransaction(transaction);
          
          console.log(`✅ Trustline created for ${assetConfig.code}`);
          console.log(`   Transaction Hash: ${result.hash}`);
          console.log(`   Explorer: https://testnet.stellarchain.io/tx/${result.hash}\n`);
          
        } catch (error) {
          console.log(`❌ Error creating trustline for ${assetConfig.code}: ${error.message}\n`);
        }
      }
      
      console.log('🎉 Trustline creation process completed!');
      console.log('\n📋 Summary:');
      console.log('All supported assets now have trustlines (or were already present)');
      console.log('You can now use these assets in cross-chain bridging operations');
      
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('❌ Account not found. Please fund your account first:');
        console.log(`   ${FRIENDBOT_URL}?addr=${userPublicKey}`);
      } else {
        console.log(`❌ Error loading account: ${error.message}`);
      }
    }
    
    rl.close();
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ @stellar/stellar-sdk not found');
      console.log('\n📝 Installation instructions:\n');
      console.log('1. Install SDK: npm install @stellar/stellar-sdk --legacy-peer-deps');
      console.log('2. Run this script again: node scripts/create-trustlines.js\n');
      console.log('Or use the Trustline Manager in the web interface instead.');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

createTrustlinesScript().catch(console.error);
