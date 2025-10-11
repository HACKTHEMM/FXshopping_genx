/**
 * Update existing Stellar testnet offers to match current market rates
 * This script updates the USDTEST→INRTEST offer from 83.5 to 88.7
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use existing accounts from setup
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';
const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function main() {
  console.log('🚀 Updating Stellar offers to match current market rates...\n');
  
  if (!DISTRIBUTOR_SECRET) {
    console.error('❌ Please set STELLAR_DISTRIBUTOR_SECRET environment variable');
    console.log('   Get it from the setup script output or .env.local file');
    process.exit(1);
  }
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  // Current market rate (88.7) vs old rate (83.5)
  const newRate = 88.7;
  const oldRate = 83.5;
  
  console.log(`📊 Updating USDTEST→INRTEST offer:`);
  console.log(`   Old rate: ${oldRate}`);
  console.log(`   New rate: ${newRate}`);
  console.log(`   Change: +${((newRate - oldRate) / oldRate * 100).toFixed(1)}%\n`);
  
  const baseAsset = new StellarSdk.Asset('USDTEST', ISSUER_PUBLIC);
  const quoteAsset = new StellarSdk.Asset('INRTEST', ISSUER_PUBLIC);
  
  try {
    // Load distributor account to get current offers
    const distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
    
    // Find the existing USDTEST→INRTEST offer
    const offers = await server.offers()
      .forAccount(DISTRIBUTOR_PUBLIC)
      .selling(baseAsset)
      .buying(quoteAsset)
      .call();
    
    console.log(`🔍 Found ${offers.records.length} existing USDTEST→INRTEST offers`);
    
    // Update each offer with new rate
    for (const offer of offers.records) {
      console.log(`   📝 Updating offer ${offer.id} (amount: ${offer.amount})`);
      
      const updateTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: baseAsset,
          buying: quoteAsset,
          amount: offer.amount, // Keep same amount
          price: newRate.toString(), // Update to new rate
          offerId: offer.id, // Update existing offer
        }))
        .setTimeout(180)
        .build();
      
      updateTx.sign(distributor);
      await server.submitTransaction(updateTx);
      console.log(`      ✅ Offer ${offer.id} updated to rate ${newRate}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Also update the reverse offer (INRTEST→USDTEST)
    const reverseOffers = await server.offers()
      .forAccount(DISTRIBUTOR_PUBLIC)
      .selling(quoteAsset)
      .buying(baseAsset)
      .call();
    
    console.log(`\n🔄 Found ${reverseOffers.records.length} existing INRTEST→USDTEST offers`);
    
    const reverseRate = (1 / newRate).toFixed(8);
    console.log(`   📝 Updating reverse rate to ${reverseRate}`);
    
    for (const offer of reverseOffers.records) {
      console.log(`   📝 Updating reverse offer ${offer.id} (amount: ${offer.amount})`);
      
      const updateTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: quoteAsset,
          buying: baseAsset,
          amount: offer.amount, // Keep same amount
          price: reverseRate, // Update to new reverse rate
          offerId: offer.id, // Update existing offer
        }))
        .setTimeout(180)
        .build();
      
      updateTx.sign(distributor);
      await server.submitTransaction(updateTx);
      console.log(`      ✅ Reverse offer ${offer.id} updated to rate ${reverseRate}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✨ All offers updated successfully!');
    console.log('\n📋 Verification:');
    console.log(`   USDTEST→INRTEST: ${newRate}`);
    console.log(`   INRTEST→USDTEST: ${reverseRate}`);
    console.log('\n🔗 Check offers at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${DISTRIBUTOR_PUBLIC}/offers`);
    
  } catch (error) {
    console.error('❌ Error updating offers:', error.message);
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
