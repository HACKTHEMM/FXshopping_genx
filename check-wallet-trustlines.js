// Check wallet trustlines on Stellar testnet
const WALLET_ADDRESS = 'GAONAOFF6BB7VSLKK34I3RS4EVV6KLSNUIJQSM56D7AUMUA37HRBWX6C';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';

async function checkAccount() {
  try {
    console.log('🔍 Checking account:', WALLET_ADDRESS.substring(0, 8) + '...\n');

    const response = await fetch(`${HORIZON_URL}/accounts/${WALLET_ADDRESS}`);

    if (response.status === 404) {
      console.log('❌ Account not found on testnet');
      console.log('   Please fund with Friendbot: https://friendbot.stellar.org');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const accountData = await response.json();

    console.log('✅ Account found on testnet\n');
    console.log('📊 Account Balances:');
    console.log('─'.repeat(70));

    accountData.balances.forEach(balance => {
      if (balance.asset_type === 'native') {
        console.log(`  💎 XLM (native): ${parseFloat(balance.balance).toFixed(7)}`);
      } else {
        console.log(`  💰 ${balance.asset_code}: ${parseFloat(balance.balance).toFixed(7)}`);
        console.log(`     Issuer: ${balance.asset_issuer}`);
        console.log(`     Limit: ${balance.limit}`);
      }
    });

    console.log('─'.repeat(70));
    console.log(`\n📈 Total assets: ${accountData.balances.length} (including XLM)`);
    console.log(`🔢 Sequence: ${accountData.sequence}`);
    console.log(`📦 Subentry count: ${accountData.subentry_count}`);

    // Check for INRTEST specifically
    console.log('\n🔍 Checking for INRTEST trustline...');
    const INRTEST_ISSUER = 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC';
    const inrtestTrustline = accountData.balances.find(
      b => b.asset_code === 'INRTEST' && b.asset_issuer === INRTEST_ISSUER
    );

    if (inrtestTrustline) {
      console.log('✅ INRTEST trustline EXISTS');
      console.log(`   Balance: ${inrtestTrustline.balance} INRTEST`);
      console.log(`   Issuer: ${INRTEST_ISSUER}`);
    } else {
      console.log('❌ INRTEST trustline MISSING');
      console.log(`   Required issuer: ${INRTEST_ISSUER}`);
      console.log('\n💡 Solution: Use the "Establish Trustline" button in the app');
    }

    // Check for USDTEST
    console.log('\n🔍 Checking for USDTEST trustline...');
    const usdtestTrustline = accountData.balances.find(
      b => b.asset_code === 'USDTEST' && b.asset_issuer === INRTEST_ISSUER
    );

    if (usdtestTrustline) {
      console.log('✅ USDTEST trustline EXISTS');
      console.log(`   Balance: ${usdtestTrustline.balance} USDTEST`);
    } else {
      console.log('❌ USDTEST trustline MISSING');
      console.log('   This will also need to be established');
    }

    console.log('\n🌐 View on Stellar Expert:');
    console.log(`   https://stellar.expert/explorer/testnet/account/${WALLET_ADDRESS}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAccount();
