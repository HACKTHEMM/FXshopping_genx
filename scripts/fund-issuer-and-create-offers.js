/**
 * Fund issuer account and create high-liquidity offers at 88.7 rate
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Your issuer account
const ISSUER_PUBLIC = 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC';
const ISSUER_SECRET = 'SBQUHCDDCMP4FQE4QR27AV3KTFN7ZRXNLTJVWS52ZSVFIABSSI5HJ6FT';

async function main() {
  console.log('🚀 Funding issuer account and creating high-liquidity offers...\n');
  console.log(`📍 Issuer account: ${ISSUER_PUBLIC}`);
  
  const issuer = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
  
  // Market rate with high liquidity
  const marketRate = 88.7;
  const highLiquidityAmount = 100000; // 100k units
  
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
    
    // Step 1: Fund issuer account with tokens (self-payment to mint)
    console.log('💰 Funding issuer account with tokens...');
    
    const fundTx = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: ISSUER_PUBLIC, // Self-payment to mint tokens
        asset: baseAsset,
        amount: highLiquidityAmount.toString(),
      }))
      .addOperation(StellarSdk.Operation.payment({
        destination: ISSUER_PUBLIC, // Self-payment to mint tokens
        asset: quoteAsset,
        amount: (highLiquidityAmount * marketRate).toString(),
      }))
      .setTimeout(180)
      .build();
    
    fundTx.sign(issuer);
    await server.submitTransaction(fundTx);
    console.log(`   ✅ Issuer funded with ${highLiquidityAmount} USDTEST and ${highLiquidityAmount * marketRate} INRTEST`);
    
    // Wait for transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Create high-liquidity offer
    console.log('\n💱 Creating high-liquidity offer...');
    
    // Reload account to get updated balances
    const updatedIssuerAccount = await server.loadAccount(ISSUER_PUBLIC);
    
    const offerTx = new StellarSdk.TransactionBuilder(updatedIssuerAccount, {
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
    
    // Step 3: Create reverse offer
    const reverseRate = (1 / marketRate).toFixed(8);
    const reverseAmount = Math.floor(highLiquidityAmount * marketRate);
    
    console.log(`\n🔄 Creating reverse offer...`);
    const reverseOfferTx = new StellarSdk.TransactionBuilder(updatedIssuerAccount, {
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
