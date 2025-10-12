/**
 * Delete offers individually with better error handling
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function deleteOffer(offerId, distributor, distributorAccount) {
  try {
    console.log(`🗑️  Deleting offer ${offerId}...`);
    
    const deleteTx = new StellarSdk.TransactionBuilder(distributorAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: StellarSdk.Asset.native(), // Dummy asset for deletion
        buying: StellarSdk.Asset.native(),   // Dummy asset for deletion
        amount: '0', // Amount 0 = delete offer
        price: '1',  // Dummy price
        offerId: offerId, // Update existing offer
      }))
      .setTimeout(180)
      .build();
    
    deleteTx.sign(distributor);
    await server.submitTransaction(deleteTx);
    console.log(`   ✅ Offer ${offerId} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to delete offer ${offerId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🗑️  Deleting offers individually...\n');
  
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
      
      const success = await deleteOffer(offer.id, distributor, distributorAccount);
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
