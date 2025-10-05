/**
 * Add more liquidity offers to existing Stellar testnet assets
 * Run this to add bidirectional liquidity without recreating all assets
 */

const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Use existing accounts from first run
const ISSUER_PUBLIC = 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC';
const DISTRIBUTOR_PUBLIC = 'GBENITEZSRVWIK4UOA5DB7QX7LP7CETENNMICKHPUAIL7EA6IOYWEICC';
const DISTRIBUTOR_SECRET = 'SB7ZQ35W2UJ4RFJF5RMFEGGOYAODJKIIKRX7UC6NZCNIAMCTTGOMLWSN';

async function main() {
  console.log('🚀 Adding more bidirectional liquidity...\n');
  
  const distributor = StellarSdk.Keypair.fromSecret(DISTRIBUTOR_SECRET);
  
  // Remaining pairs to add
  const pairs = [
    { base: 'USDTEST', quote: 'PHPTEST', rate: 56.2 },  // Continue from where we left off
    { base: 'USDTEST', quote: 'EURTEST', rate: 0.92 },
    { base: 'EURTEST', quote: 'INRTEST', rate: 90.8 },
    { base: 'EURTEST', quote: 'PHPTEST', rate: 61.1 },
    { base: 'PHPTEST', quote: 'INRTEST', rate: 1.486 },
  ];
  
  for (const pair of pairs) {
    const baseAsset = new StellarSdk.Asset(pair.base, ISSUER_PUBLIC);
    const quoteAsset = new StellarSdk.Asset(pair.quote, ISSUER_PUBLIC);
    
    try {
      // Direction 1: Base → Quote
      console.log(`💱 ${pair.base} → ${pair.quote} @ ${pair.rate}`);
      let distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
      let offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: baseAsset,
          buying: quoteAsset,
          amount: '25000', // 25k tokens depth
          price: pair.rate.toString(),
        }))
        .setTimeout(180)
        .build();
      
      offerTx.sign(distributor);
      await server.submitTransaction(offerTx);
      console.log(`   ✅ Forward offer created`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Direction 2: Quote → Base
      const reverseRate = (1 / pair.rate).toFixed(8);
      console.log(`💱 ${pair.quote} → ${pair.base} @ ${reverseRate}`);
      distributorAccount = await server.loadAccount(DISTRIBUTOR_PUBLIC);
      offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: quoteAsset,
          buying: baseAsset,
          amount: '25000', // Same depth
          price: reverseRate,
        }))
        .setTimeout(180)
        .build();
      
      offerTx.sign(distributor);
      await server.submitTransaction(offerTx);
      console.log(`   ✅ Reverse offer created\n`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error(`❌ Error creating ${pair.base}/${pair.quote}:`, error.response?.data || error.message);
      console.log('   ⏭️  Continuing...\n');
    }
  }
  
  console.log('✨ Liquidity update complete!\n');
  console.log('📊 Total offers created: ~12 bidirectional pairs');
  console.log('🔗 View on Stellar Expert: https://stellar.expert/explorer/testnet/account/' + DISTRIBUTOR_PUBLIC);
}

main().catch(console.error);
