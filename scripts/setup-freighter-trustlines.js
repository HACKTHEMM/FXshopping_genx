/**
 * Setup trustlines for Freighter wallet
 * This creates trustlines for all test assets
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Your Freighter wallet
const FREIGHTER_PUBLIC = 'GCFQNS6RDTHO2SP7CNYZJ3IU2S3MI5KERU2ITXVZXBQBCLD6IKHKOPKJ';
const FREIGHTER_SECRET = process.env.FREIGHTER_SECRET;

// Issuer
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';

async function main() {
  console.log('🔗 Setting up trustlines for Freighter wallet...\n');
  console.log(`📍 Freighter wallet: ${FREIGHTER_PUBLIC}`);
  
  if (!FREIGHTER_SECRET) {
    console.error('❌ Please set FREIGHTER_SECRET environment variable');
    console.log('   Get it from your Freighter wallet settings');
    process.exit(1);
  }
  
  const freighter = StellarSdk.Keypair.fromSecret(FREIGHTER_SECRET);
  
  // Define all test assets
  const assets = [
    { code: 'USDTEST', name: 'US Dollar Test' },
    { code: 'INRTEST', name: 'Indian Rupee Test' },
    { code: 'PHPTEST', name: 'Philippine Peso Test' },
    { code: 'EURTEST', name: 'Euro Test' },
  ];
  
  console.log('📊 Creating trustlines for:');
  assets.forEach(asset => {
    console.log(`   ${asset.code} (${asset.name})`);
  });
  console.log('');
  
  try {
    // Load Freighter account
    const freighterAccount = await server.loadAccount(FREIGHTER_PUBLIC);
    
    // Create trustline for each asset
    for (const asset of assets) {
      console.log(`🔗 Creating trustline for ${asset.code}...`);
      
      const stellarAsset = new StellarSdk.Asset(asset.code, ISSUER_PUBLIC);
      
      const trustTx = new StellarSdk.TransactionBuilder(freighterAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: stellarAsset,
          limit: '1000000000', // 1 billion limit
        }))
        .setTimeout(180)
        .build();
      
      trustTx.sign(freighter);
      await server.submitTransaction(trustTx);
      console.log(`   ✅ ${asset.code} trustline created successfully`);
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✨ All trustlines created successfully!');
    console.log('\n🔗 Check trustlines at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${FREIGHTER_PUBLIC}`);
    console.log('\n💡 You can now receive test tokens and create offers!');
    
  } catch (error) {
    console.error('❌ Error creating trustlines:', error.message);
    if (error.response) {
      try {
        const errorText = await error.response.text();
        console.error('   Response:', errorText);
      } catch (e) {
        console.error('   Response:', error.response);
      }
    }
  }
}

main().catch(console.error);
