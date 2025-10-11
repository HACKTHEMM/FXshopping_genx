/**
 * Foreign Exchange Rate Service
 * Fetches real-time currency exchange rates from ExchangeRate-API
 * Implements caching to avoid rate limits and improve performance
 */

export interface FXRates {
  base: string;
  rates: Record<string, number>;
  timestamp: Date;
  source: string;
  disclaimer?: string;
}

export interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  timestamp: Date;
}

class FXRateService {
  private cache: Map<string, FXRates> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds
  private readonly API_KEY = process.env.EXCHANGERATE_API_KEY;
  private readonly API_URL = this.API_KEY
    ? `https://v6.exchangerate-api.com/v6/${this.API_KEY}/latest`
    : 'https://api.exchangerate-api.com/v4/latest';

  /**
   * Truncate rate to 3 decimal places (not round)
   * Example: 0.0119 → 0.011 (truncate), not 0.012 (round)
   */
  private truncateRate(rate: number): number {
    return Math.floor(rate * 1000) / 1000;
  }

  private readonly FALLBACK_RATES: Record<string, Record<string, number>> = {
    // Fallback rates if API fails (updated October 2025)
    USD: {
      INR: 83.5,
      EUR: 0.92,
      PHP: 56.2,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.24,
    },
    EUR: {
      USD: 1.09,
      INR: 90.8,
      PHP: 61.1,
      GBP: 0.86,
      JPY: 162.8,
      CNY: 7.88,
    },
    INR: {
      USD: 0.012,
      EUR: 0.011,
      PHP: 0.673,
      GBP: 0.0095,
      JPY: 1.79,
      CNY: 0.087,
    },
    PHP: {
      USD: 0.0178,
      EUR: 0.0164,
      INR: 1.486,
      GBP: 0.0141,
      JPY: 2.66,
      CNY: 0.129,
    },
  };

  /**
   * Get exchange rates for a base currency
   * Uses cache if available and not expired
   */
  async getRates(baseCurrency: string = 'USD'): Promise<FXRates> {
    const cacheKey = baseCurrency.toUpperCase();

    // Check cache
    if (
      this.cache.has(cacheKey) &&
      this.cacheExpiry.has(cacheKey) &&
      Date.now() < this.cacheExpiry.get(cacheKey)!
    ) {
      console.log(`✅ FX rates cache HIT for ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    console.log(`🔄 FX rates cache MISS for ${cacheKey}, fetching...`);

    try {
      // Fetch fresh rates from API
      const response = await fetch(`${this.API_URL}/${cacheKey}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();

      // Handle both v4 (free) and v6 (with API key) response formats
      const ratesData = data.conversion_rates || data.rates;
      const timestamp = data.time_last_update_unix || data.time_last_updated;

      if (!ratesData) {
        throw new Error('No rates data in API response');
      }

      const rates: FXRates = {
        base: cacheKey,
        rates: ratesData,
        timestamp: new Date(timestamp * 1000),
        source: this.API_KEY ? 'ExchangeRate-API (v6 Premium)' : 'ExchangeRate-API (v4 Free)',
      };

      // Update cache
      this.cache.set(cacheKey, rates);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      console.log(`✅ Fetched ${Object.keys(ratesData).length} rates for ${cacheKey}`);
      return rates;

    } catch (error) {
      console.error('❌ FX API error:', error);

      // Use fallback rates
      if (this.FALLBACK_RATES[cacheKey]) {
        console.log(`⚠️  Using fallback rates for ${cacheKey}`);
        const fallbackRates: FXRates = {
          base: cacheKey,
          rates: this.FALLBACK_RATES[cacheKey],
          timestamp: new Date(),
          source: 'Fallback (Cached)',
          disclaimer: 'Using cached rates due to API unavailability',
        };

        // Cache fallback for short duration
        this.cache.set(cacheKey, fallbackRates);
        this.cacheExpiry.set(cacheKey, Date.now() + 5000); // 5 seconds only

        return fallbackRates;
      }

      throw new Error(`FX rates unavailable for ${cacheKey}`);
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(from: string, to: string, amount: number): Promise<ConversionResult> {
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();

    // Handle same currency
    if (fromCurrency === toCurrency) {
      return {
        from: fromCurrency,
        to: toCurrency,
        amount,
        result: amount,
        rate: 1,
        timestamp: new Date(),
      };
    }

    const rates = await this.getRates(fromCurrency);
    const rawRate = rates.rates[toCurrency];

    if (!rawRate) {
      throw new Error(`Rate not available for ${fromCurrency} → ${toCurrency}`);
    }

    // Truncate rate to 3 decimal places
    const rate = this.truncateRate(rawRate);

    return {
      from: fromCurrency,
      to: toCurrency,
      amount,
      result: amount * rate,
      rate,
      timestamp: rates.timestamp,
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getRate(from: string, to: string): Promise<number> {
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();

    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rates = await this.getRates(fromCurrency);
    const rawRate = rates.rates[toCurrency];

    if (!rawRate) {
      throw new Error(`Rate not available for ${fromCurrency} → ${toCurrency}`);
    }

    // Truncate rate to 3 decimal places
    return this.truncateRate(rawRate);
  }

  /**
   * Get multiple rates at once (batch operation)
   */
  async getBatchRates(
    baseCurrency: string,
    targetCurrencies: string[]
  ): Promise<Record<string, number>> {
    const rates = await this.getRates(baseCurrency);
    const result: Record<string, number> = {};

    for (const currency of targetCurrencies) {
      const upperCurrency = currency.toUpperCase();
      if (rates.rates[upperCurrency]) {
        // Truncate rate to 3 decimal places
        result[upperCurrency] = this.truncateRate(rates.rates[upperCurrency]);
      }
    }

    return result;
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('🗑️  FX rates cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ currency: string; expiresIn: number }>;
  } {
    const entries = Array.from(this.cache.keys()).map((currency) => ({
      currency,
      expiresIn: Math.max(0, (this.cacheExpiry.get(currency) || 0) - Date.now()),
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Check if a currency pair is supported
   */
  async isSupported(from: string, to: string): Promise<boolean> {
    try {
      const fromCurrency = from.toUpperCase();
      const toCurrency = to.toUpperCase();

      if (fromCurrency === toCurrency) return true;

      const rates = await this.getRates(fromCurrency);
      return toCurrency in rates.rates;
    } catch {
      return false;
    }
  }

  /**
   * Get list of supported currencies
   */
  async getSupportedCurrencies(baseCurrency: string = 'USD'): Promise<string[]> {
    try {
      const rates = await this.getRates(baseCurrency);
      return [baseCurrency, ...Object.keys(rates.rates)];
    } catch {
      return Object.keys(this.FALLBACK_RATES);
    }
  }
}

// Export singleton instance
export const fxRateService = new FXRateService();

// Export class for testing
export { FXRateService };
