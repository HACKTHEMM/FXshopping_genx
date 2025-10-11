/**
 * Smart Contract Test Script
 * 
 * Run this to verify the smart contract integration is working
 * 
 * Usage:
 *   node scripts/test-smart-contract.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const TEST_USER = 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD';
const TEST_ROUTE = {
  routeId: `test-route-${Date.now()}`,
  sendAsset: { code: 'USDTEST', issuer: 'GTEST...' },
  destAsset: { code: 'INRTEST', issuer: 'GTEST...' },
  grossSend: 1000,
  netReceive: 82500,
  legs: [
    {
      type: 'stellar-path',
      from: 'USDTEST',
      to: 'INRTEST',
      rate: 82.5,
      estSeconds: 5,
      fees: [],
    },
  ],
  totalFees: 0,
  effectiveRate: 82.5,
  riskScore: 0.1,
  slippagePct: 5,
  execution: {
    canBuildXDR: true,
    contractAttestationSupported: true,
    requiresKYC: false,
    estimatedConfirmationTime: 5,
  },
  createdAt: new Date().toISOString(),
};

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    console.error(`❌ API call failed:`, error.message);
    return { ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Smart Contract Integration\n');
  console.log('=' . repeat(60));

  let routeId = null;
  let allPassed = true;

  // Test 1: Attest Route
  console.log('\n📝 Test 1: Attest Route');
  console.log('-'.repeat(60));
  const attestResponse = await apiCall('/api/routes/attest', {
    method: 'POST',
    body: JSON.stringify({
      userPublicKey: TEST_USER,
      route: TEST_ROUTE,
      execution: {
        maxSlippagePct: 5,
        preferredSpeed: 'fast',
      },
    }),
  });

  if (attestResponse.ok && attestResponse.data.success) {
    routeId = attestResponse.data.attestation.routeId;
    console.log('✅ PASS: Route attested successfully');
    console.log(`   Route ID: ${routeId}`);
    console.log(`   Expected: ${attestResponse.data.attestation.expectedNet}`);
    console.log(`   Status: ${attestResponse.data.attestation.status}`);
  } else {
    console.log('❌ FAIL: Route attestation failed');
    console.log('   Error:', attestResponse.data.error || attestResponse.error);
    allPassed = false;
  }

  // Test 2: Query Route Status
  console.log('\n🔍 Test 2: Query Route Status');
  console.log('-'.repeat(60));
  if (routeId) {
    const queryResponse = await apiCall(`/api/routes/finalize?routeId=${routeId}`);

    if (queryResponse.ok && queryResponse.data.success) {
      console.log('✅ PASS: Route query successful');
      console.log(`   Status: ${queryResponse.data.route.status}`);
      console.log(`   Expected: ${queryResponse.data.route.expectedNet}`);
    } else {
      console.log('❌ FAIL: Route query failed');
      allPassed = false;
    }
  } else {
    console.log('⏭️  SKIP: No route ID from Test 1');
    allPassed = false;
  }

  // Test 3: Finalize Route
  console.log('\n✅ Test 3: Finalize Route');
  console.log('-'.repeat(60));
  if (routeId) {
    const actualReceived = 82750; // Better than expected
    const txHash = 'a'.repeat(64); // Mock tx hash

    const finalizeResponse = await apiCall('/api/routes/finalize', {
      method: 'POST',
      body: JSON.stringify({
        userPublicKey: TEST_USER,
        routeId,
        stellarTxHash: txHash,
        actualReceived,
      }),
    });

    if (finalizeResponse.ok && finalizeResponse.data.success) {
      console.log('✅ PASS: Route finalized successfully');
      console.log(`   Expected: ${finalizeResponse.data.finalization.expectedReceived}`);
      console.log(`   Actual: ${finalizeResponse.data.finalization.actualReceived}`);
      console.log(`   Variance: ${finalizeResponse.data.finalization.variancePct.toFixed(2)}%`);
      console.log(`   Outcome: ${finalizeResponse.data.analysis.outcome}`);
    } else {
      console.log('❌ FAIL: Route finalization failed');
      console.log('   Error:', finalizeResponse.data.error || finalizeResponse.error);
      allPassed = false;
    }
  } else {
    console.log('⏭️  SKIP: No route ID from Test 1');
    allPassed = false;
  }

  // Test 4: User Statistics
  console.log('\n📊 Test 4: User Statistics');
  console.log('-'.repeat(60));
  const statsResponse = await apiCall(`/api/routes/stats?user=${TEST_USER}&includeHistory=true`);

  if (statsResponse.ok && statsResponse.data.success) {
    console.log('✅ PASS: User stats retrieved');
    if (statsResponse.data.stats) {
      console.log(`   Total Routes: ${statsResponse.data.stats.totalRoutes}`);
      console.log(`   Success Rate: ${statsResponse.data.stats.averageSuccessRate}`);
      console.log(`   Performance: ${statsResponse.data.insights.performance}`);
    } else {
      console.log('   No stats yet (new user)');
    }
  } else {
    console.log('❌ FAIL: User stats query failed');
    allPassed = false;
  }

  // Test 5: Platform Analytics
  console.log('\n📈 Test 5: Platform Analytics');
  console.log('-'.repeat(60));
  const analyticsResponse = await apiCall('/api/routes/analytics?detailed=true');

  if (analyticsResponse.ok && analyticsResponse.data.success) {
    console.log('✅ PASS: Platform analytics retrieved');
    console.log(`   Total Routes: ${analyticsResponse.data.contractStats.totalRoutes}`);
    console.log(`   Total Users: ${analyticsResponse.data.contractStats.totalUsers}`);
    console.log(`   Success Rate: ${analyticsResponse.data.contractStats.successRate}`);
    console.log(`   Health: ${analyticsResponse.data.insights.health}`);
  } else {
    console.log('❌ FAIL: Platform analytics query failed');
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 All Tests Passed! Smart Contract is working perfectly.');
    console.log('\n✅ Next Steps:');
    console.log('   1. Integrate into your payment flow');
    console.log('   2. Build UI components');
    console.log('   3. Test with real transactions');
    console.log('\n📚 See SMART_CONTRACT_QUICKSTART.md for examples');
  } else {
    console.log('⚠️  Some Tests Failed');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure server is running (npm run dev)');
    console.log('   2. Check console logs for errors');
    console.log('   3. Verify port 3000 is available');
  }
  console.log('='.repeat(60));
}

// Run tests
console.log('\n🚀 Starting Smart Contract Tests...\n');
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
