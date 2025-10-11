/**
 * Quick script to check if a Stellar account is funded on testnet
 *
 * Usage: node scripts/check-account.js <PUBLIC_KEY>
 */

const fetch = require('node-fetch');

async function checkAccount(publicKey) {
  console.log('🔍 Checking account on Stellar testnet...');
  console.log('📍 Address:', publicKey);
  console.log('');

  try {
    // Query Horizon testnet
    const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);

    if (response.status === 404) {
      console.log('❌ Account NOT FOUND on testnet');
      console.log('');
      console.log('This account needs to be activated.');
      console.log('');
      console.log('To activate it, visit:');
      console.log(`https://friendbot.stellar.org?addr=${publicKey}`);
      console.log('');
      return;
    }

    if (!response.ok) {
      console.log('❌ Error:', response.status, response.statusText);
      return;
    }

    const data = await response.json();

    console.log('✅ Account FOUND on testnet!');
    console.log('');
    console.log('Account Details:');
    console.log('  Account ID:', data.account_id);
    console.log('  Sequence:', data.sequence);
    console.log('  Subentry Count:', data.subentry_count);
    console.log('');
    console.log('Balances:');

    data.balances.forEach(balance => {
      if (balance.asset_type === 'native') {
        console.log(`  💰 XLM: ${parseFloat(balance.balance).toFixed(2)}`);
      } else {
        console.log(`  💵 ${balance.asset_code}: ${parseFloat(balance.balance).toFixed(2)}`);
      }
    });

    console.log('');
    console.log('Explorer URL:');
    console.log(`https://stellar.expert/explorer/testnet/account/${publicKey}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get public key from command line
const publicKey = process.argv[2];

if (!publicKey) {
  console.log('Usage: node scripts/check-account.js <PUBLIC_KEY>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/check-account.js GCKFBE...');
  process.exit(1);
}

if (!publicKey.startsWith('G') || publicKey.length !== 56) {
  console.log('❌ Invalid public key format');
  console.log('Public keys should start with "G" and be 56 characters long');
  process.exit(1);
}

checkAccount(publicKey);
