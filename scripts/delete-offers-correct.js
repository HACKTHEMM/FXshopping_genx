/**
 * Delete offers using the correct method - fetch offer details first
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function deleteOffer(offer, distributor, distributorAccount) {
  try {
    console.log(`🗑️  Deleting offer ${offer.id}...`);
    
    // Create the correct assets for deletion
    const sellingAsset = offer.selling.asset_type === 'native' 
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(offer.selling.asset_code, offer.selling.asset_issuer);
    
    const buyingAsset = offer.buying.asset_type === 'native'
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(offer.buying.asset_code, offer.buying.asset_issuer);
    
    const deleteTx = new StellarSdk.TransactionBuilder(distributorAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: sellingAsset,
        buying: buyingAsset,
        amount: '0', // Amount 0 = delete offer
        price: offer.price,
        offerId: offer.id, // Update existing offer
      }))
      .setTimeout(180)
      .build();
    
    deleteTx.sign(distributor);
    await server.submitTransaction(deleteTx);
    console.log(`   ✅ Offer ${offer.id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to delete offer ${offer.id}:`, error.message);
    if (error.response && error.response.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function main() {
  console.log('🗑️  Deleting offers with correct asset handling...\n');
  
  if (!DISTRIBUTOR_SECRET) {
    console.error('❌ Please set STELLAR_DISTRIBUTOR_SECRET environment variable');
    process.exit(1);
  }
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  try {
    // Load distributor account
    const distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
    
    // Get all existing offers
    console.log('🔍 Fetching existing offers...');
    const offers = await server.offers()
      .forAccount(DISTRIBUTOR_PUBLIC)
      .call();
    
    console.log(`📊 Found ${offers.records.length} existing offers`);
    
    if (offers.records.length === 0) {
      console.log('✅ No offers to delete');
      return;
    }
    
    // Delete each offer individually
    let deletedCount = 0;
    for (const offer of offers.records) {
      console.log(`\n📝 Offer ${offer.id}:`);
      console.log(`   ${offer.selling.asset_code} → ${offer.buying.asset_code} @ ${offer.price}`);
      console.log(`   Amount: ${offer.amount}`);
      console.log(`   Selling issuer: ${offer.selling.asset_issuer}`);
      console.log(`   Buying issuer: ${offer.buying.asset_issuer}`);
      
      const success = await deleteOffer(offer, distributor, distributorAccount);
      if (success) {
        deletedCount++;
      }
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n✨ Deletion completed! ${deletedCount}/${offers.records.length} offers deleted`);
    console.log('\n🔗 Verify at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${DISTRIBUTOR_PUBLIC}/offers`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
