/**
 * Add a market rate offer (88.7) to the Stellar testnet orderbook
 * This creates a new offer at the current market rate
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use existing accounts from setup
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';
const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function main() {
  console.log('🚀 Adding market rate offer (88.7) to Stellar testnet...\n');
  
  if (!DISTRIBUTOR_SECRET) {
    console.error('❌ Please set STELLAR_DISTRIBUTOR_SECRET environment variable');
    process.exit(1);
  }
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  // Market rate
  const marketRate = 88.7;
  const offerAmount = 1000; // Small amount to test
  
  console.log(`📊 Creating USDTEST→INRTEST offer:`);
  console.log(`   Rate: ${marketRate}`);
  console.log(`   Amount: ${offerAmount} USDTEST`);
  console.log(`   Expected receive: ${offerAmount * marketRate} INRTEST\n`);
  
  const baseAsset = new StellarSdk.Asset('USDTEST', ISSUER_PUBLIC);
  const quoteAsset = new StellarSdk.Asset('INRTEST', ISSUER_PUBLIC);
  
  try {
    // Load distributor account
    const distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
    
    console.log('💱 Creating market rate offer...');
    
    const offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: baseAsset,
        buying: quoteAsset,
        amount: offerAmount.toString(),
        price: marketRate.toString(),
      }))
      .setTimeout(180)
      .build();
    
    offerTx.sign(distributor);
    await server.submitTransaction(offerTx);
    console.log(`   ✅ Market rate offer created successfully`);
    
    // Also create reverse offer
    const reverseRate = (1 / marketRate).toFixed(8);
    const reverseAmount = Math.floor(offerAmount * marketRate);
    
    console.log(`\n🔄 Creating reverse offer: ${reverseAmount} INRTEST → USDTEST @ ${reverseRate}`);
    
    const reverseOfferTx = new StellarSdk.TransactionBuilder(distributorAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: quoteAsset,
        buying: baseAsset,
        amount: reverseAmount.toString(),
        price: reverseRate,
      }))
      .setTimeout(180)
      .build();
    
    reverseOfferTx.sign(distributor);
    await server.submitTransaction(reverseOfferTx);
    console.log(`   ✅ Reverse offer created successfully`);
    
    console.log('\n✨ Market rate offers created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   USDTEST→INRTEST: ${marketRate} (${offerAmount} units)`);
    console.log(`   INRTEST→USDTEST: ${reverseRate} (${reverseAmount} units)`);
    console.log('\n🔗 Check offers at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${DISTRIBUTOR_PUBLIC}/offers`);
    console.log('\n💡 The system should now be able to execute at the market rate!');
    
  } catch (error) {
    console.error('❌ Error creating offers:', error.message);
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
