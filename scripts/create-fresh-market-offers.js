/**
 * Create fresh offers at current market rates
 * This will create new offers at 88.7 rate alongside existing ones
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use existing accounts from setup
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';
const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function main() {
  console.log('🚀 Creating fresh offers at current market rates...\n');
  
  if (!DISTRIBUTOR_SECRET) {
    console.error('❌ Please set STELLAR_DISTRIBUTOR_SECRET environment variable');
    process.exit(1);
  }
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  // Current market rates
  const marketRates = {
    'USDTEST-INRTEST': 88.7,
    'USDTEST-PHPTEST': 56.2,
    'USDTEST-EURTEST': 0.92,
    'EURTEST-INRTEST': 90.8,
    'PHPTEST-INRTEST': 1.486,
  };
  
  console.log('📊 Creating offers at current market rates:');
  Object.entries(marketRates).forEach(([pair, rate]) => {
    console.log(`   ${pair}: ${rate}`);
  });
  console.log('');
  
  try {
    // Load distributor account
    const distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
    
    // Create offers for each pair
    for (const [pair, rate] of Object.entries(marketRates)) {
      const [base, quote] = pair.split('-');
      console.log(`💱 Creating ${base} → ${quote} offer @ ${rate}`);
      
      const baseAsset = new StellarSdk.Asset(base, ISSUER_PUBLIC);
      const quoteAsset = new StellarSdk.Asset(quote, ISSUER_PUBLIC);
      
      // Create forward offer
      const offerAmount = 1000; // Small amount for testing
      const offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: baseAsset,
          buying: quoteAsset,
          amount: offerAmount.toString(),
          price: rate.toString(),
        }))
        .setTimeout(180)
        .build();
      
      offerTx.sign(distributor);
      await server.submitTransaction(offerTx);
      console.log(`   ✅ Forward offer created: ${offerAmount} ${base} → ${quote} @ ${rate}`);
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create reverse offer
      const reverseRate = (1 / rate).toFixed(8);
      const reverseAmount = Math.floor(offerAmount * rate);
      
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
      console.log(`   ✅ Reverse offer created: ${reverseAmount} ${quote} → ${base} @ ${reverseRate}`);
      
      console.log('');
      
      // Wait between pairs
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✨ All market rate offers created successfully!');
    console.log('\n📋 Summary:');
    Object.entries(marketRates).forEach(([pair, rate]) => {
      console.log(`   ${pair}: ${rate}`);
    });
    console.log('\n🔗 Check offers at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${DISTRIBUTOR_PUBLIC}/offers`);
    console.log('\n💡 The system should now be able to execute at market rates!');
    
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
