/**
 * Real Provider Fee Structures
 *
 * Based on research of actual international money transfer providers (2025).
 * Fee structures sourced from public pricing pages and comparison sites.
 *
 * Sources:
 * - Wise: wise.com/pricing (0.33-0.51% variable fee)
 * - MoneyGram: moneygram.com (flat fees + exchange rate markup ~2-3%)
 * - Western Union: westernunion.com (flat fees + exchange rate markup ~3-5%)
 * - Remitly: remitly.com (0-3 USD flat + markup)
 * - Stellar Network: stellar.org (network fee only, ~0.00001 XLM)
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseFeePercent: number;      // Percentage fee (e.g., 0.45 = 0.45%)
  flatFee: number;              // Flat fee in USD
  spreadPercent: number;        // Exchange rate markup percentage
  speedTier: 'instant' | 'fast' | 'medium' | 'slow';
  estimatedTime: number;        // Seconds
  reliability: number;          // 0-1 score
  minAmount: number;            // Minimum transfer amount (USD)
  maxAmount: number;            // Maximum transfer amount (USD)
  supportedCurrencies: string[];
  description: string;
}

/**
 * Provider Fee Structures
 *
 * Realistic fee structures based on 2025 market research.
 * All fees are approximations for demonstration purposes.
 */
export const PROVIDER_FEE_STRUCTURES: Record<string, ProviderConfig> = {
  wise: {
    id: 'wise',
    name: 'Wise',
    baseFeePercent: 0.43,        // 0.43% average (varies 0.33-0.51% by corridor)
    flatFee: 0,                  // No flat fee (included in percentage)
    spreadPercent: 0,            // Uses mid-market rate (no markup)
    speedTier: 'medium',
    estimatedTime: 3600,         // 1 hour typical
    reliability: 0.98,
    minAmount: 1,
    maxAmount: 1000000,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP', 'AUD', 'CAD', 'SGD'],
    description: 'Low-cost transfers with mid-market exchange rate',
  },

  moneygram: {
    id: 'moneygram',
    name: 'MoneyGram',
    baseFeePercent: 0,           // Primarily flat fees
    flatFee: 5.0,                // $5 typical flat fee (varies by corridor)
    spreadPercent: 2.5,          // ~2-3% exchange rate markup
    speedTier: 'fast',
    estimatedTime: 600,          // 10 minutes typical
    reliability: 0.92,
    minAmount: 50,
    maxAmount: 10000,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP', 'MXN', 'NGN'],
    description: 'Fast cash pickup with global network',
  },

  westernunion: {
    id: 'westernunion',
    name: 'Western Union',
    baseFeePercent: 0,           // Primarily flat fees
    flatFee: 8.0,                // $8 typical flat fee (higher for credit card)
    spreadPercent: 3.5,          // ~3-5% exchange rate markup
    speedTier: 'instant',
    estimatedTime: 300,          // 5 minutes ("Money in Minutes")
    reliability: 0.95,
    minAmount: 50,
    maxAmount: 10000,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP', 'MXN', 'CNY', 'BRL'],
    description: 'Instant transfers with extensive agent network',
  },

  remitly: {
    id: 'remitly',
    name: 'Remitly',
    baseFeePercent: 0,
    flatFee: 1.99,               // $1.99 economy, $3.99 express
    spreadPercent: 1.5,          // ~1-2% exchange rate markup
    speedTier: 'medium',
    estimatedTime: 7200,         // 2 hours economy, instant available
    reliability: 0.94,
    minAmount: 10,
    maxAmount: 10000,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP', 'VND', 'KES'],
    description: 'Economy and express tiers for flexible pricing',
  },

  'stellar-onchain': {
    id: 'stellar-onchain',
    name: 'Stellar Network (On-Chain)',
    baseFeePercent: 0,
    flatFee: 0.00001,            // ~0.00001 XLM network fee (≈$0.000003)
    spreadPercent: 0,            // No markup, uses DEX rates
    speedTier: 'instant',
    estimatedTime: 5,            // 5 seconds ledger close time
    reliability: 0.99,
    minAmount: 0.01,
    maxAmount: 10000000,         // No practical limit
    supportedCurrencies: ['XLM', 'USDC', 'INRTEST', 'USDTEST', 'EURTEST', 'PHPTEST'],
    description: 'Direct blockchain settlement with minimal fees',
  },
};

/**
 * Calculate fees for a given provider and amount
 */
export function calculateProviderFee(
  providerId: string,
  sendAmount: number,
  exchangeRate: number
): {
  flatFee: number;
  percentageFee: number;
  totalFee: number;
  receiveAmount: number;
  effectiveRate: number;
  breakdown: string[];
} {
  const provider = PROVIDER_FEE_STRUCTURES[providerId];

  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  // Calculate flat fee
  const flatFee = provider.flatFee;

  // Calculate percentage fee
  const percentageFee = (sendAmount * provider.baseFeePercent) / 100;

  // Total fee
  const totalFee = flatFee + percentageFee;

  // Amount after fees
  const amountAfterFees = sendAmount - totalFee;

  // Apply exchange rate
  const grossReceive = amountAfterFees * exchangeRate;

  // Apply spread (exchange rate markup)
  const spreadAdjustment = 1 - provider.spreadPercent / 100;
  const receiveAmount = grossReceive * spreadAdjustment;

  // Effective rate (includes all fees)
  const effectiveRate = receiveAmount / sendAmount;

  // Breakdown
  const breakdown: string[] = [];
  if (flatFee > 0) {
    breakdown.push(`Flat fee: $${flatFee.toFixed(2)}`);
  }
  if (percentageFee > 0) {
    breakdown.push(`Service fee (${provider.baseFeePercent}%): $${percentageFee.toFixed(2)}`);
  }
  if (provider.spreadPercent > 0) {
    breakdown.push(`Exchange rate markup (${provider.spreadPercent}%)`);
  }
  if (breakdown.length === 0) {
    breakdown.push('No fees (network fee only)');
  }

  return {
    flatFee,
    percentageFee,
    totalFee,
    receiveAmount,
    effectiveRate,
    breakdown,
  };
}

/**
 * Get list of all supported providers
 */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_FEE_STRUCTURES);
}

/**
 * Get providers that support a specific currency pair
 */
export function getProvidersForCurrencyPair(
  sourceCurrency: string,
  destCurrency: string
): ProviderConfig[] {
  return getAllProviders().filter(
    (provider) =>
      (provider.supportedCurrencies.includes(sourceCurrency) ||
        provider.id === 'stellar-onchain') &&
      (provider.supportedCurrencies.includes(destCurrency) ||
        provider.id === 'stellar-onchain')
  );
}
