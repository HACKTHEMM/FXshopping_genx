/**
 * Script to issue demo tokens on Stellar testnet
 * Creates INRTEST, USDTEST, PHPTEST, EURTEST tokens with real issuer accounts
 */

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// Generate a keypair
function generateKeypair() {
  const nacl = require('tweetnacl');
  const keypair = nacl.sign.keyPair();
  
  // Stellar uses base32 encoding (StrKey)
  // We'll use a simple implementation
  const publicKey = encodePublicKey(keypair.publicKey);
  const secretKey = encodeSecretKey(keypair.secretKey);
  
  return { publicKey, secretKey };
}

// Base32 alphabet (Stellar uses RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(data) {
  let bits = '';
  for (let i = 0; i < data.length; i++) {
    bits += data[i].toString(2).padStart(8, '0');
  }
  
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  
  return result;
}

function crc16(data) {
  let crc = 0x0000;
  for (let i = 0; i < data.length; i++) {
    let code = crc >>> 8 & 0xFF;
    code ^= data[i] & 0xFF;
    code ^= code >>> 4;
    crc = (crc << 8) & 0xFFFF;
    crc ^= code;
    code = (code << 5) & 0xFFFF;
    crc ^= code;
    code = (code << 7) & 0xFFFF;
    crc ^= code;
  }
  return crc;
}

function encodePublicKey(rawPublicKey) {
  const versionByte = 6 << 3; // Version byte for public key
  const payload = Buffer.concat([Buffer.from([versionByte]), Buffer.from(rawPublicKey)]);
  const checksum = crc16(payload);
  const checksumBytes = Buffer.from([checksum & 0xFF, (checksum >> 8) & 0xFF]);
  const unencoded = Buffer.concat([payload, checksumBytes]);
  return 'G' + base32Encode(unencoded).replace(/=/g, '');
}

function encodeSecretKey(rawSecretKey) {
  const versionByte = 18 << 3; // Version byte for secret key
  const payload = Buffer.concat([Buffer.from([versionByte]), Buffer.from(rawSecretKey.slice(0, 32))]);
  const checksum = crc16(payload);
  const checksumBytes = Buffer.from([checksum & 0xFF, (checksum >> 8) & 0xFF]);
  const unencoded = Buffer.concat([payload, checksumBytes]);
  return 'S' + base32Encode(unencoded).replace(/=/g, '');
}

async function fundAccount(publicKey) {
  console.log(`🔹 Funding account ${publicKey}...`);
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    if (response.ok) {
      console.log(`✅ Account funded successfully`);
      return true;
    } else {
      console.error(`❌ Friendbot error: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to fund account:`, error.message);
    return false;
  }
}

async function getAccountSequence(publicKey) {
  const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch account: ${response.status}`);
  }
  const data = await response.json();
  return data.sequence;
}

async function submitTransaction(txXDR) {
  const response = await fetch(`${HORIZON_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `tx=${encodeURIComponent(txXDR)}`,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Transaction failed: ${JSON.stringify(error)}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('🚀 Setting up Stellar testnet demo assets\n');
  
  // For simplicity, let's use stellar-sdk if available, otherwise provide manual steps
  try {
    // Try to use stellar-sdk
    const StellarSdk = require('@stellar/stellar-sdk');
    
    console.log('📦 Using @stellar/stellar-sdk\n');
    
    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    
    // Create issuer account for all tokens
    console.log('1️⃣ Creating issuer account...');
    const issuer = StellarSdk.Keypair.random();
    console.log(`   Public Key: ${issuer.publicKey()}`);
    console.log(`   Secret Key: ${issuer.secret()}\n`);
    
    // Fund issuer
    await fundAccount(issuer.publicKey());
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create distributor account
    console.log('\n2️⃣ Creating distributor account...');
    const distributor = StellarSdk.Keypair.random();
    console.log(`   Public Key: ${distributor.publicKey()}`);
    console.log(`   Secret Key: ${distributor.secret()}\n`);
    
    // Fund distributor
    await fundAccount(distributor.publicKey());
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Define tokens
    const tokens = [
      { code: 'INRTEST', name: 'Indian Rupee Test' },
      { code: 'USDTEST', name: 'US Dollar Test' },
      { code: 'PHPTEST', name: 'Philippine Peso Test' },
      { code: 'EURTEST', name: 'Euro Test' },
    ];
    
    console.log('\n3️⃣ Creating trustlines and issuing tokens...\n');
    
    for (const token of tokens) {
      console.log(`   📝 Processing ${token.code} (${token.name})`);
      
      const asset = new StellarSdk.Asset(token.code, issuer.publicKey());
      
      // Create trustline from distributor to issuer
      const distributorAccount = await server.loadAccount(distributor.publicKey());
      const trustTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: '1000000000', // 1 billion
        }))
        .setTimeout(180)
        .build();
      
      trustTx.sign(distributor);
      await server.submitTransaction(trustTx);
      console.log(`      ✅ Trustline established`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Issue tokens (send from issuer to distributor)
      const issuerAccount = await server.loadAccount(issuer.publicKey());
      const paymentTx = new StellarSdk.TransactionBuilder(issuerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: distributor.publicKey(),
          asset: asset,
          amount: '100000000', // 100 million tokens
        }))
        .setTimeout(180)
        .build();
      
      paymentTx.sign(issuer);
      await server.submitTransaction(paymentTx);
      console.log(`      ✅ Issued 100,000,000 ${token.code}\n`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Create bidirectional liquidity (offers in both directions)
    console.log('\n4️⃣ Creating bidirectional liquidity...\n');
    
    // Define all currency pairs with market rates
    const pairs = [
      { base: 'USDTEST', quote: 'INRTEST', rate: 83.5 },  // 1 USD = 83.5 INR
      { base: 'USDTEST', quote: 'PHPTEST', rate: 56.2 },  // 1 USD = 56.2 PHP
      { base: 'USDTEST', quote: 'EURTEST', rate: 0.92 },  // 1 USD = 0.92 EUR
      { base: 'EURTEST', quote: 'INRTEST', rate: 90.8 },  // 1 EUR = 90.8 INR
      { base: 'EURTEST', quote: 'PHPTEST', rate: 61.1 },  // 1 EUR = 61.1 PHP
      { base: 'PHPTEST', quote: 'INRTEST', rate: 1.486 }, // 1 PHP = 1.486 INR
    ];
    
    for (const pair of pairs) {
      const baseAsset = new StellarSdk.Asset(pair.base, issuer.publicKey());
      const quoteAsset = new StellarSdk.Asset(pair.quote, issuer.publicKey());
      
      // Create offer in BOTH directions for each pair
      
      // Direction 1: Sell base, buy quote (e.g., sell USD, buy INR @ 83.5)
      console.log(`   💱 ${pair.base} → ${pair.quote} @ ${pair.rate}`);
      let distributorAccount = await server.loadAccount(distributor.publicKey());
      let offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: baseAsset,
          buying: quoteAsset,
          amount: '50000', // 50k tokens depth
          price: pair.rate.toString(),
        }))
        .setTimeout(180)
        .build();
      
      offerTx.sign(distributor);
      await server.submitTransaction(offerTx);
      console.log(`      ✅ Forward offer created`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Direction 2: Sell quote, buy base (e.g., sell INR, buy USD @ 1/83.5)
      const reverseRate = (1 / pair.rate).toFixed(8);
      const reverseAmount = Math.min(50000 * pair.rate, 50000).toFixed(2); // Cap at 50k
      console.log(`   💱 ${pair.quote} → ${pair.base} @ ${reverseRate}`);
      distributorAccount = await server.loadAccount(distributor.publicKey());
      offerTx = new StellarSdk.TransactionBuilder(distributorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(StellarSdk.Operation.manageSellOffer({
          selling: quoteAsset,
          buying: baseAsset,
          amount: reverseAmount, // Capped equivalent amount
          price: reverseRate,
        }))
        .setTimeout(180)
        .build();
      
      offerTx.sign(distributor);
      await server.submitTransaction(offerTx);
      console.log(`      ✅ Reverse offer created\n`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✨ Setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SAVE THESE KEYS:\n');
    console.log(`Issuer Public Key:  ${issuer.publicKey()}`);
    console.log(`Issuer Secret Key:  ${issuer.secret()}\n`);
    console.log(`Distributor Public: ${distributor.publicKey()}`);
    console.log(`Distributor Secret: ${distributor.secret()}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔧 Add this to your .env.local:\n');
    console.log(`STELLAR_ISSUER_PUBLIC="${issuer.publicKey()}"`);
    console.log(`STELLAR_ISSUER_SECRET="${issuer.secret()}"`);
    console.log(`STELLAR_DISTRIBUTOR_PUBLIC="${distributor.publicKey()}"`);
    console.log(`STELLAR_DISTRIBUTOR_SECRET="${distributor.secret()}"\n`);
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ @stellar/stellar-sdk not found');
      console.log('\n📝 Manual setup instructions:\n');
      console.log('1. Install SDK: npm install @stellar/stellar-sdk --legacy-peer-deps');
      console.log('2. Run this script again: node scripts/setup-stellar-assets.js\n');
      console.log('Or use the Stellar Laboratory: https://laboratory.stellar.org/#account-creator?network=test');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

main().catch(console.error);
