/**
 * Mint tokens for issuer account to create high-liquidity offers
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
  console.log('🪙 Minting tokens for issuer account...\n');
  console.log(`📍 Issuer account: ${ISSUER_PUBLIC}`);
  console.log(`📍 Freighter wallet: ${FREIGHTER_PUBLIC}`);
  
  const issuer = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
  
  // Amounts to mint for high-liquidity offers
  const mintAmounts = {
    'USDTEST': 200000,    // 200k USDTEST
    'INRTEST': 17740000,  // 200k * 88.7 = 17.74M INRTEST
    'PHPTEST': 11240000,  // 200k * 56.2 = 11.24M PHPTEST
    'EURTEST': 184000,    // 200k * 0.92 = 184k EURTEST
  };
  
  console.log('📊 Minting amounts:');
  Object.entries(mintAmounts).forEach(([code, amount]) => {
    console.log(`   ${code}: ${amount.toLocaleString()}`);
  });
  console.log('');
  
  try {
    // Load issuer account
    const issuerAccount = await server.loadAccount(ISSUER_PUBLIC);
    
    // Mint each token
    for (const [code, amount] of Object.entries(mintAmounts)) {
      console.log(`🪙 Minting ${amount.toLocaleString()} ${code}...`);
      
      const asset = new StellarSdk.Asset(code, ISSUER_PUBLIC);
      
      const mintTx = new StellarSdk.TransactionBuilder(issuerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: FREIGHTER_PUBLIC,
          asset: asset,
          amount: amount.toString(),
        }))
        .setTimeout(180)
        .build();
      
      mintTx.sign(issuer);
      await server.submitTransaction(mintTx);
      console.log(`   ✅ ${amount.toLocaleString()} ${code} minted successfully`);
      
      // Wait between transactions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✨ All tokens minted successfully!');
    console.log('\n📋 Summary:');
    Object.entries(mintAmounts).forEach(([code, amount]) => {
      console.log(`   ${code}: ${amount.toLocaleString()}`);
    });
    console.log('\n🔗 Check balances at:');
    console.log(`   https://horizon-testnet.stellar.org/accounts/${FREIGHTER_PUBLIC}`);
    console.log('\n💡 You can now create high-liquidity offers at 88.7 rate!');
    
  } catch (error) {
    console.error('❌ Error minting tokens:', error.message);
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
