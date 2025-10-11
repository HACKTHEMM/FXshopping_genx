/**
 * Delete all existing offers from Stellar testnet distributor account
 * This clears the orderbook so we can create fresh offers at market rates
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use existing accounts from setup
const DISTRIBUTOR_PUBLIC = 'GC3EAV57VCU4OP46TQL6UIIRRDYZG74VGVLQ3YODCKQWFPVPX2B2ZTM2';
const DISTRIBUTOR_SECRET = process.env.STELLAR_DISTRIBUTOR_SECRET;

async function main() {
  console.log('🗑️  Deleting all offers from Stellar testnet...\n');
  
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
    
    // Delete each offer
    for (let i = 0; i < offers.records.length; i++) {
      const offer = offers.records[i];
      console.log(`🗑️  Deleting offer ${i + 1}/${offers.records.length}: ID ${offer.id}`);
      console.log(`   ${offer.selling.asset_code} → ${offer.buying.asset_code} @ ${offer.price}`);
      
      try {
        const deleteTx = new StellarSdk.TransactionBuilder(distributorAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(StellarSdk.Operation.manageSellOffer({
            selling: new StellarSdk.Asset(offer.selling.asset_code, offer.selling.asset_issuer),
            buying: new StellarSdk.Asset(offer.buying.asset_code, offer.buying.asset_issuer),
            amount: '0', // Amount 0 = delete offer
            price: offer.price,
            offerId: offer.id, // Update existing offer
          }))
          .setTimeout(180)
          .build();
        
        deleteTx.sign(distributor);
        await server.submitTransaction(deleteTx);
        console.log(`   ✅ Offer ${offer.id} deleted successfully`);
        
        // Wait between transactions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Failed to delete offer ${offer.id}:`, error.message);
        // Continue with other offers even if one fails
      }
    }
    
    console.log('\n✨ All offers deletion completed!');
    console.log('\n🔗 Verify at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${DISTRIBUTOR_PUBLIC}/offers`);
    console.log('\n💡 You can now create fresh offers at market rates');
    
  } catch (error) {
    console.error('❌ Error deleting offers:', error.message);
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
