#!/usr/bin/env node

/**
 * Send Test Tokens to a User Account
 *
 * Usage:
 *   node scripts/send-test-tokens.js YOUR_PUBLIC_KEY AMOUNT
 *
 * Example:
 *   node scripts/send-test-tokens.js GXXXXXX... 1000
 */

const StellarSdk = require('@stellar/stellar-sdk');
require('dotenv').config({ path: '.env.local' });

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

async function sendTestTokens() {
  // Get command line arguments
  const recipientPublicKey = process.argv[2];
  const amount = process.argv[3] || '1000';

  if (!recipientPublicKey) {
    console.error('❌ Error: Please provide a recipient public key');
    console.log('\nUsage:');
    console.log('  node scripts/send-test-tokens.js YOUR_PUBLIC_KEY [AMOUNT]');
    console.log('\nExample:');
    console.log('  node scripts/send-test-tokens.js GXXXXXX... 1000');
    process.exit(1);
  }

  // Validate public key
  if (!recipientPublicKey.startsWith('G') || recipientPublicKey.length !== 56) {
    console.error('❌ Error: Invalid Stellar public key');
    console.error('   Public keys start with "G" and are 56 characters long');
    process.exit(1);
  }

  // Get issuer credentials from .env.local
  const issuerSecret = process.env.STELLAR_ISSUER_SECRET;
  const issuerPublic = process.env.STELLAR_ISSUER_PUBLIC;

  if (!issuerSecret || !issuerPublic) {
    console.error('❌ Error: Missing STELLAR_ISSUER_SECRET or STELLAR_ISSUER_PUBLIC in .env.local');
    process.exit(1);
  }

  console.log('🚀 Sending Test Tokens to Freighter Wallet\n');
  console.log('Recipient:', recipientPublicKey);
  console.log('Amount:', amount);
  console.log('Issuer:', issuerPublic);
  console.log('Network: Stellar Testnet\n');

  try {
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);

    // Load issuer account
    console.log('📡 Loading issuer account...');
    const issuerAccount = await server.loadAccount(issuerPublic);

    // Check if recipient has trustlines
    console.log('🔍 Checking recipient trustlines...');
    let recipientAccount;
    try {
      recipientAccount = await server.loadAccount(recipientPublicKey);
    } catch (error) {
      console.error('❌ Error: Recipient account not found');
      console.error('   Make sure the account is funded with XLM first');
      console.error('   Use Friendbot: https://laboratory.stellar.org/#account-creator?network=test');
      process.exit(1);
    }

    // Define test assets
    const testAssets = [
      { code: 'INRTEST', name: 'Indian Rupee Test' },
      { code: 'USDTEST', name: 'US Dollar Test' },
    ];

    // Send tokens for each asset the user has a trustline for
    for (const assetInfo of testAssets) {
      const asset = new StellarSdk.Asset(assetInfo.code, issuerPublic);

      // Check if recipient has trustline
      const hasTrustline = recipientAccount.balances.some(
        b => b.asset_code === assetInfo.code && b.asset_issuer === issuerPublic
      );

      if (!hasTrustline) {
        console.log(`⏭️  Skipping ${assetInfo.code} - No trustline found`);
        continue;
      }

      console.log(`\n💸 Sending ${amount} ${assetInfo.code}...`);

      // Build payment transaction
      const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: recipientPublicKey,
            asset: asset,
            amount: amount.toString(),
          })
        )
        .addMemo(StellarSdk.Memo.text('FXShopping Test Tokens'))
        .setTimeout(180)
        .build();

      // Sign transaction
      transaction.sign(issuerKeypair);

      // Submit to network
      const result = await server.submitTransaction(transaction);

      console.log(`✅ ${assetInfo.code} sent successfully!`);
      console.log(`   Transaction: ${result.hash}`);
      console.log(`   Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);

      // Update issuer account for next transaction
      const updatedIssuer = await server.loadAccount(issuerPublic);
      issuerAccount.sequence = updatedIssuer.sequence;
    }

    console.log('\n🎉 All done! Check your Freighter wallet.');
    console.log('\n📝 Next steps:');
    console.log('   1. Open Freighter wallet');
    console.log('   2. Verify INRTEST and USDTEST balances');
    console.log('   3. Go to http://localhost:3000');
    console.log('   4. Try a transaction!\n');

  } catch (error) {
    console.error('\n❌ Error sending tokens:', error.message);

    if (error.response?.data?.extras) {
      console.error('\nDetails:', JSON.stringify(error.response.data.extras, null, 2));
    }

    process.exit(1);
  }
}

sendTestTokens();
