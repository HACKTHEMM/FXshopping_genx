/**
 * Fund Freighter wallet with test tokens for creating high-liquidity offers
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Your Freighter wallet
const FREIGHTER_PUBLIC = 'GCFQNS6RDTHO2SP7CNYZJ3IU2S3MI5KERU2ITXVZXBQBCLD6IKHKOPKJ';

// Distributor account (has the tokens)
const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

// Issuer
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';

async function main() {
  console.log('💰 Funding Freighter wallet with test tokens...\n');
  console.log(`📍 Freighter wallet: ${FREIGHTER_PUBLIC}`);
  
  if (!DISTRIBUTOR_SECRET) {
    console.error('❌ Please set STELLAR_DISTRIBUTOR_SECRET environment variable');
    process.exit(1);
  }
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  // Amount to send for high-liquidity offers
  const fundingAmount = 100000; // 100k tokens for high liquidity
  
  console.log(`📊 Funding amounts:`);
  console.log(`   USDTEST: ${fundingAmount}`);
  console.log(`   INRTEST: ${fundingAmount * 88.7}`);
  console.log(`   PHPTEST: ${fundingAmount * 56.2}`);
  console.log(`   EURTEST: ${fundingAmount * 0.92}\n`);
  
  try {
    // Load distributor account
    const distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
    
    // Define tokens to fund
    const tokens = [
      { code: 'USDTEST', amount: fundingAmount },
      { code: 'INRTEST', amount: Math.floor(fundingAmount * 88.7) },
      { code: 'PHPTEST', amount: Math.floor(fundingAmount * 56.2) },
      { code: 'EURTEST', amount: Math.floor(fundingAmount * 0.92) },
    ];
    
    // Send each token
    for (const token of tokens) {
      console.log(`💸 Sending ${token.amount} ${token.code}...`);
      
      const asset = new StellarSdk.Asset(token.code, ISSUER_PUBLIC);
      
      const paymentTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: FREIGHTER_PUBLIC,
          asset: asset,
          amount: token.amount.toString(),
        }))
        .setTimeout(180)
        .build();
      
      paymentTx.sign(distributor);
      await server.submitTransaction(paymentTx);
      console.log(`   ✅ ${token.amount} ${token.code} sent successfully`);
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✨ Freighter wallet funded successfully!');
    console.log('\n📋 Summary:');
    tokens.forEach(token => {
      console.log(`   ${token.code}: ${token.amount}`);
    });
    console.log('\n🔗 Check balances at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${FREIGHTER_PUBLIC}`);
    console.log('\n💡 You can now create high-liquidity offers at 88.7 rate!');
    
  } catch (error) {
    console.error('❌ Error funding wallet:', error.message);
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
