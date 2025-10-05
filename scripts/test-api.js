#!/usr/bin/env node

/**
 * Simple API test script for StellarFX Shopper
 * Run with: node scripts/test-api.js
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`\n🧪 Testing ${method} ${endpoint}`);
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      console.log(`📊 Response:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Failed (${response.status})`);
      console.log(`📊 Error:`, JSON.stringify(data, null, 2));
    }

    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`💥 Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting StellarFX Shopper API Tests');
  console.log(`📍 Testing against: ${API_BASE_URL}`);

  const results = [];

  // Test 1: Health Check
  results.push(await testEndpoint('/health'));

  // Test 2: Get Currencies
  results.push(await testEndpoint('/currencies'));

  // Test 3: Search Routes
  results.push(await testEndpoint('/routes/search', 'POST', {
    sourceCurrency: 'USD',
    targetCurrency: 'INR',
    sourceAmount: 1000,
  }));

  // Test 4: Execute Payment (Mock)
  results.push(await testEndpoint('/routes/execute', 'POST', {
    routeId: 'stellar_onchain_1234567890_0',
    sourceAccount: 'GCKFBEIYTKPQY5H...',
    targetAccount: 'GBKFBEIYTKPQY5H...',
    sourceCurrency: 'USD',
    targetCurrency: 'INR',
    sourceAmount: 1000,
    targetAmount: 83250,
    routeType: 'stellar_onchain',
    memo: 'Test payment',
  }));

  // Test 5: Transaction Status
  results.push(await testEndpoint('/routes/status?transactionHash=mock_hash_123'));

  // Summary
  console.log('\n📋 Test Summary');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Make sure the server is running:');
    console.log('   npm run dev');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or a fetch polyfill');
  console.log('💡 Install node-fetch: npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);
