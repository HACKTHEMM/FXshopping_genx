/**
 * Test script for FX rate service
 * Run with: node scripts/test-fx-rates.js
 */

const FX_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

async function testFXRateAPI() {
  console.log('🧪 Testing FX Rate API Integration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log(`📡 Fetching rates from: ${FX_API_URL}`);
    const startTime = Date.now();

    const response = await fetch(FX_API_URL);
    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`✅ Success! Response time: ${elapsed}ms\n`);
    console.log(`📊 API Response Details:`);
    console.log(`   Provider: ${data.provider || 'ExchangeRate-API'}`);
    console.log(`   Base Currency: ${data.base}`);
    console.log(`   Last Updated: ${new Date(data.time_last_updated * 1000).toISOString()}`);
    console.log(`   Total Currencies: ${Object.keys(data.rates).length}\n`);

    console.log(`💱 Key Exchange Rates (from USD):`);
    const keyCurrencies = ['INR', 'EUR', 'PHP', 'GBP', 'JPY', 'CNY'];
    keyCurrencies.forEach(currency => {
      if (data.rates[currency]) {
        console.log(`   1 USD = ${data.rates[currency].toFixed(4)} ${currency}`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test cross-currency calculations
    console.log(`🧮 Cross-Currency Calculations:\n`);

    const testCases = [
      { from: 'USD', to: 'INR', amount: 100 },
      { from: 'USD', to: 'EUR', amount: 100 },
      { from: 'USD', to: 'PHP', amount: 1000 },
    ];

    for (const test of testCases) {
      const rate = data.rates[test.to];
      if (rate) {
        const result = test.amount * rate;
        console.log(`   ${test.amount} ${test.from} = ${result.toFixed(2)} ${test.to} (@ ${rate.toFixed(4)})`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calculate cross rates (for non-USD pairs)
    console.log(`🔄 Cross Rates (calculated):\n`);

    const crossPairs = [
      { base: 'EUR', quote: 'INR' },
      { base: 'EUR', quote: 'PHP' },
      { base: 'PHP', quote: 'INR' },
    ];

    for (const pair of crossPairs) {
      const baseRate = data.rates[pair.base];
      const quoteRate = data.rates[pair.quote];

      if (baseRate && quoteRate) {
        const crossRate = quoteRate / baseRate;
        console.log(`   1 ${pair.base} = ${crossRate.toFixed(4)} ${pair.quote}`);
      }
    }

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📝 Error details:', error);
    process.exit(1);
  }
}

// Run test
testFXRateAPI();
