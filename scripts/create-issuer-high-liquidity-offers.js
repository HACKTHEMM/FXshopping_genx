/**
 * Create high-liquidity offers at 88.7 rate using issuer account
 * This will create offers with more liquidity than the existing 83.5 offers
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Your issuer account
const ISSUER_PUBLIC = 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC';
const ISSUER_SECRET = 'SBQUHCDDCMP4FQE4QR27AV3KTFN7ZRXNLTJVWS52ZSVFIABSSI5HJ6FT';

// Freighter wallet for receiving
const FREIGHTER_PUBLIC = 'GCFQNS6RDTHO2SP7CNYZJ3IU2S3MI5KERU2ITXVZXBQBCLD6IKHKOPKJ';

async function main() {
  console.log('🚀 Creating high-liquidity offers at 88.7 rate using issuer account...\n');
  console.log(`📍 Issuer account: ${ISSUER_PUBLIC}`);
  console.log(`📍 Freighter wallet: ${FREIGHTER_PUBLIC}`);
  
  const issuer = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
  
  // Market rate with high liquidity
  const marketRate = 88.7;
  const highLiquidityAmount = 100000; // Much larger than existing 10,000 offers
  
  console.log(`📊 Creating high-liquidity offers:`);
  console.log(`   Rate: ${marketRate}`);
  console.log(`   Amount: ${highLiquidityAmount} USDTEST`);
  console.log(`   Expected receive: ${highLiquidityAmount * marketRate} INRTEST`);
  console.log(`   This will have 10x more liquidity than existing offers\n`);
  
  const baseAsset = new StellarSdk.Asset('USDTEST', ISSUER_PUBLIC);
  const quoteAsset = new StellarSdk.Asset('INRTEST', ISSUER_PUBLIC);
  
  try {
    // Load issuer account
    const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);
    
    // Check balances
    console.log('💰 Checking issuer balances...');
    const usdBalance = issuerAccount.balances.find(b => 
      b.asset_type !== 'native' && b.asset_code === 'USDTEST' && b.asset_issuer === ISSUER_PUBLIC
    );
    const inrBalance = issuerAccount.balances.find(b => 
      b.asset_type !== 'native' && b.asset_code === 'INRTEST' && b.asset_issuer === ISSUER_PUBLIC
    );
    
    console.log(`   USDTEST balance: ${usdBalance ? usdBalance.balance : '0'}`);
    console.log(`   INRTEST balance: ${inrBalance ? inrBalance.balance : '0'}`);
    
    if (!usdBalance || parseFloat(usdBalance.balance) < highLiquidityAmount) {
      console.log('\n⚠️  Insufficient USDTEST balance for high-liquidity offer');
      console.log(`   Required: ${highLiquidityAmount} USDTEST`);
      console.log(`   Available: ${usdBalance ? usdBalance.balance : '0'} USDTEST`);
      console.log('\n💡 Issuer needs to mint more USDTEST tokens first');
      return;
    }
    
    // Create high-liquidity offer
    console.log('\n💱 Creating high-liquidity offer...');
    const offerTx = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: baseAsset,
        buying: quoteAsset,
        amount: highLiquidityAmount.toString(),
        price: marketRate.toString(),
      }))
      .setTimeout(180)
      .build();
    
    offerTx.sign(issuer);
    await server.submitTransaction(offerTx);
    console.log(`   ✅ High-liquidity offer created successfully!`);
    console.log(`   ${highLiquidityAmount} USDTEST → INRTEST @ ${marketRate}`);
    
    // Create reverse offer
    const reverseRate = (1 / marketRate).toFixed(8);
    const reverseAmount = Math.floor(highLiquidityAmount * marketRate);
    
    console.log(`\n🔄 Creating reverse offer...`);
    const reverseOfferTx = new StellarSdk.TransactionBuilder(issuerAccount, {
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
    
    reverseOfferTx.sign(issuer);
    await server.submitTransaction(reverseOfferTx);
    console.log(`   ✅ Reverse offer created successfully!`);
    console.log(`   ${reverseAmount} INRTEST → USDTEST @ ${reverseRate}`);
    
    console.log('\n✨ High-liquidity offers created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   USDTEST→INRTEST: ${marketRate} (${highLiquidityAmount} units)`);
    console.log(`   INRTEST→USDTEST: ${reverseRate} (${reverseAmount} units)`);
    console.log('\n🔗 Check offers at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${ISSUER_PUBLIC}/offers`);
    console.log('\n💡 Stellar will now prefer these high-liquidity offers at 88.7 rate!');
    
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
