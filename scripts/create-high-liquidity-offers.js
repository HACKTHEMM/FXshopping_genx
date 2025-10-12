/**
 * Create high-liquidity offers at 88.7 rate using Freighter wallet
 * This will create offers with more liquidity than the existing 83.5 offers
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use your Freighter wallet address
const FREIGHTER_PUBLIC = 'GCFQNS6RDTHO2SP7CNYZJ3IU2S3MI5KERU2ITXVZXBQBCLD6IKHKOPKJ';
const FREIGHTER_SECRET = process.env.FREIGHTER_SECRET;

// Existing issuer
const ISSUER_PUBLIC = 'GBZWNG2FDICVPDRJ7DMZPV3I76W4G6ISSIU2FHO7RKIZAEF5AA5SUUYP';

async function main() {
  console.log('🚀 Creating high-liquidity offers at 88.7 rate...\n');
  console.log(`📍 Using Freighter wallet: ${FREIGHTER_PUBLIC}`);
  
  if (!FREIGHTER_SECRET) {
    console.error('❌ Please set FREIGHTER_SECRET environment variable');
    console.log('   Get it from your Freighter wallet settings');
    process.exit(1);
  }
  
  const freighter = StellarSdk.Keypair.fromSecret(FREIGHTER_SECRET);
  
  // Market rate with high liquidity
  const marketRate = 88.7;
  const highLiquidityAmount = 50000; // Much larger than existing 10,000 offers
  
  console.log(`📊 Creating high-liquidity offers:`);
  console.log(`   Rate: ${marketRate}`);
  console.log(`   Amount: ${highLiquidityAmount} USDTEST`);
  console.log(`   Expected receive: ${highLiquidityAmount * marketRate} INRTEST`);
  console.log(`   This will have 5x more liquidity than existing offers\n`);
  
  const baseAsset = new StellarSdk.Asset('USDTEST', ISSUER_PUBLIC);
  const quoteAsset = new StellarSdk.Asset('INRTEST', ISSUER_PUBLIC);
  
  try {
    // Load Freighter account
    const freighterAccount = await server.loadAccount(FREIGHTER_PUBLIC);
    
    // Check if account has trustlines for both assets
    console.log('🔍 Checking trustlines...');
    const hasUSDTEST = freighterAccount.balances.some(b => 
      b.asset_type !== 'native' && b.asset_code === 'USDTEST' && b.asset_issuer === ISSUER_PUBLIC
    );
    const hasINRTEST = freighterAccount.balances.some(b => 
      b.asset_type !== 'native' && b.asset_code === 'INRTEST' && b.asset_issuer === ISSUER_PUBLIC
    );
    
    console.log(`   USDTEST trustline: ${hasUSDTEST ? '✅' : '❌'}`);
    console.log(`   INRTEST trustline: ${hasINRTEST ? '✅' : '❌'}`);
    
    if (!hasUSDTEST || !hasINRTEST) {
      console.log('\n⚠️  Missing trustlines. Creating trustlines first...');
      
      // Create trustlines if missing
      if (!hasUSDTEST) {
        console.log('📝 Creating USDTEST trustline...');
        const trustTx = new StellarSdk.TransactionBuilder(freighterAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(StellarSdk.Operation.changeTrust({
            asset: baseAsset,
            limit: '1000000000', // 1 billion
          }))
          .setTimeout(180)
          .build();
        
        trustTx.sign(freighter);
        await server.submitTransaction(trustTx);
        console.log('   ✅ USDTEST trustline created');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (!hasINRTEST) {
        console.log('📝 Creating INRTEST trustline...');
        const trustTx = new StellarSdk.TransactionBuilder(freighterAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(StellarSdk.Operation.changeTrust({
            asset: quoteAsset,
            limit: '1000000000', // 1 billion
          }))
          .setTimeout(180)
          .build();
        
        trustTx.sign(freighter);
        await server.submitTransaction(trustTx);
        console.log('   ✅ INRTEST trustline created');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Reload account to get updated trustlines
      const freighterAccount = await server.loadAccount(FREIGHTER_PUBLIC);
    }
    
    // Check balances
    console.log('\n💰 Checking balances...');
    const usdBalance = freighterAccount.balances.find(b => 
      b.asset_type !== 'native' && b.asset_code === 'USDTEST' && b.asset_issuer === ISSUER_PUBLIC
    );
    const inrBalance = freighterAccount.balances.find(b => 
      b.asset_type !== 'native' && b.asset_code === 'INRTEST' && b.asset_issuer === ISSUER_PUBLIC
    );
    
    console.log(`   USDTEST balance: ${usdBalance ? usdBalance.balance : '0'}`);
    console.log(`   INRTEST balance: ${inrBalance ? inrBalance.balance : '0'}`);
    
    if (!usdBalance || parseFloat(usdBalance.balance) < highLiquidityAmount) {
      console.log('\n⚠️  Insufficient USDTEST balance for high-liquidity offer');
      console.log(`   Required: ${highLiquidityAmount} USDTEST`);
      console.log(`   Available: ${usdBalance ? usdBalance.balance : '0'} USDTEST`);
      console.log('\n💡 You need to receive USDTEST tokens first');
      console.log('   You can get test tokens from the distributor account');
      return;
    }
    
    // Create high-liquidity offer
    console.log('\n💱 Creating high-liquidity offer...');
    const offerTx = new StellarSdk.TransactionBuilder(freighterAccount, {
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
    
    offerTx.sign(freighter);
    await server.submitTransaction(offerTx);
    console.log(`   ✅ High-liquidity offer created successfully!`);
    console.log(`   ${highLiquidityAmount} USDTEST → INRTEST @ ${marketRate}`);
    
    // Create reverse offer
    const reverseRate = (1 / marketRate).toFixed(8);
    const reverseAmount = Math.floor(highLiquidityAmount * marketRate);
    
    console.log(`\n🔄 Creating reverse offer...`);
    const reverseOfferTx = new StellarSdk.TransactionBuilder(freighterAccount, {
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
    
    reverseOfferTx.sign(freighter);
    await server.submitTransaction(reverseOfferTx);
    console.log(`   ✅ Reverse offer created successfully!`);
    console.log(`   ${reverseAmount} INRTEST → USDTEST @ ${reverseRate}`);
    
    console.log('\n✨ High-liquidity offers created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   USDTEST→INRTEST: ${marketRate} (${highLiquidityAmount} units)`);
    console.log(`   INRTEST→USDTEST: ${reverseRate} (${reverseAmount} units)`);
    console.log('\n🔗 Check offers at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${FREIGHTER_PUBLIC}/offers`);
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
