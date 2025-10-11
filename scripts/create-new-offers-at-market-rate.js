/**
 * Create new Stellar testnet offers at current market rates
 * This script creates new USDTEST→INRTEST offers at 88.7 rate
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use existing accounts from setup
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';
const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function main() {
  console.log('🚀 Creating new Stellar offers at current market rates...\n');
  
  if (!DISTRIBUTOR_SECRET) {
    console.error('❌ Please set STELLAR_DISTRIBUTOR_SECRET environment variable');
    console.log('   Get it from the setup script output or .env.local file');
    process.exit(1);
  }
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  // Current market rate
  const newRate = 88.7;
  
  console.log(`📊 Creating new USDTEST→INRTEST offers at rate: ${newRate}\n`);
  
  const baseAsset = new StellarSdk.Asset('USDTEST', ISSUER_PUBLIC);
  const quoteAsset = new StellarSdk.Asset('INRTEST', ISSUER_PUBLIC);
  
  try {
    // Load distributor account
    const distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
    
    // Create multiple offers at the new rate for better liquidity
    const offerAmounts = [5000, 10000, 15000]; // Different amounts for better liquidity
    
    for (let i = 0; i < offerAmounts.length; i++) {
      const amount = offerAmounts[i];
      console.log(`💱 Creating offer ${i + 1}: ${amount} USDTEST → INRTEST @ ${newRate}`);
      
      const offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: baseAsset,
          buying: quoteAsset,
          amount: amount.toString(),
          price: newRate.toString(),
        }))
        .setTimeout(180)
        .build();
      
      offerTx.sign(distributor);
      await server.submitTransaction(offerTx);
      console.log(`   ✅ Offer ${i + 1} created successfully`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Also create reverse offers (INRTEST→USDTEST)
    const reverseRate = (1 / newRate).toFixed(8);
    console.log(`\n🔄 Creating reverse offers: INRTEST → USDTEST @ ${reverseRate}`);
    
    for (let i = 0; i < offerAmounts.length; i++) {
      const amount = Math.floor(offerAmounts[i] * newRate); // Convert to INR amount
      console.log(`💱 Creating reverse offer ${i + 1}: ${amount} INRTEST → USDTEST @ ${reverseRate}`);
      
      const reverseOfferTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: quoteAsset,
          buying: baseAsset,
          amount: amount.toString(),
          price: reverseRate,
        }))
        .setTimeout(180)
        .build();
      
      reverseOfferTx.sign(distributor);
      await server.submitTransaction(reverseOfferTx);
      console.log(`   ✅ Reverse offer ${i + 1} created successfully`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✨ All new offers created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   USDTEST→INRTEST: ${newRate} (${offerAmounts.length} offers)`);
    console.log(`   INRTEST→USDTEST: ${reverseRate} (${offerAmounts.length} offers)`);
    console.log('\n🔗 Check offers at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${DISTRIBUTOR_PUBLIC}/offers`);
    console.log('\n💡 Note: The system will now use the best available rate from all offers');
    
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
