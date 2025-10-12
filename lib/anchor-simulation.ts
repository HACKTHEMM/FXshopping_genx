/**
 * Anchor Simulation Layer
 *
 * Simulates SEP-24 compliant anchor deposit/withdrawal flows for fiat on/off-ramping.
 * This is a demonstration layer for hackathon/MVP purposes.
 *
 * In production, this would integrate with real anchor services like:
 * - Vibrant anchor (vibrantapp.com)
 * - MoneyGram Access (stellar.org/ecosystem/moneygram-access)
 * - Circle USDC on/off-ramp
 *
 * Architecture is SEP-24 ready - can be replaced with real anchor integration.
 */

import { fxRateService } from './fx-rates';

export interface AnchorFees {
  deposit: number;      // Deposit fee amount
  withdrawal: number;   // Withdrawal fee amount
  network: number;      // Stellar network fee (fixed at ~0.01 XLM)
}

export interface AnchorSimulation {
  type: 'deposit' | 'withdrawal';
  fiatCurrency: string;
  tokenCurrency: string;
  fiatAmount: number;
  tokenAmount: number;
  fees: AnchorFees;
  estimatedTime: number; // seconds
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sep24Url?: string; // Would contain real SEP-24 interactive URL in production
}

/**
 * Anchor Simulator
 *
 * Simulates the deposit and withdrawal process for converting between
 * fiat currencies and their tokenized equivalents on Stellar testnet.
 *
 * Fee Structure (realistic estimates):
 * - Deposit: 0.2% of fiat amount (typical for crypto on-ramps)
 * - Withdrawal: 0.5% of fiat amount (typical for crypto off-ramps)
 * - Network: 0.01 XLM (~$0.003 USD) for Stellar transaction
 *
 * Processing Times (realistic estimates):
 * - Deposit: 5 minutes (bank → blockchain)
 * - Withdrawal: 1 hour (blockchain → bank)
 */
class AnchorSimulator {
  private readonly DEPOSIT_FEE_PERCENT = 0.002;   // 0.2%
  private readonly WITHDRAWAL_FEE_PERCENT = 0.005; // 0.5%
  private readonly NETWORK_FEE = 0.01;             // 0.01 XLM

  private readonly DEPOSIT_TIME = 300;    // 5 minutes
  private readonly WITHDRAWAL_TIME = 3600; // 1 hour

  private readonly SUPPORTED_CURRENCIES = ['INR', 'USD', 'PHP', 'EUR'];

  /**
   * Simulate Deposit: Fiat → Token
   *
   * Flow:
   * 1. User initiates deposit via bank transfer/card
   * 2. Anchor receives fiat funds
   * 3. Anchor deducts deposit fee
   * 4. Anchor issues equivalent tokens on Stellar
   * 5. User receives tokens in their wallet
   *
   * @param fiatCurrency - Source fiat currency (INR, USD, etc.)
   * @param tokenCurrency - Target token on Stellar (INRTEST, USDTEST, etc.)
   * @param fiatAmount - Amount of fiat to deposit
   * @returns Simulation result with fees and amounts
   */
  async simulateDeposit(
    fiatCurrency: string,
    tokenCurrency: string,
    fiatAmount: number
  ): Promise<AnchorSimulation> {
    if (!this.supportsCurrency(fiatCurrency)) {
      throw new Error(`Anchor does not support ${fiatCurrency}`);
    }

    // Get real-time exchange rate from FX service
    // For tokens like INRTEST → base currency is INR
    // For tokens like USDTEST → base currency is USD
    const tokenBaseCurrency = tokenCurrency.replace('TEST', '').toUpperCase();

    // If fiat currency matches token base, use 1:1 peg (e.g., INR → INRTEST)
    // Otherwise, convert using real FX rates (e.g., USD → INRTEST needs USD/INR rate)
    let exchangeRate = 1;
    if (fiatCurrency.toUpperCase() !== tokenBaseCurrency) {
      try {
        exchangeRate = await fxRateService.getRate(fiatCurrency, tokenBaseCurrency);
        console.log(`✅ Anchor deposit rate: 1 ${fiatCurrency} = ${exchangeRate} ${tokenBaseCurrency} (real-time)`);
      } catch (error) {
        console.warn(`⚠️  Could not fetch rate for ${fiatCurrency}/${tokenBaseCurrency}, using 1:1 fallback`);
        exchangeRate = 1;
      }
    }

    // Calculate fees
    const depositFee = fiatAmount * this.DEPOSIT_FEE_PERCENT;
    const networkFee = this.NETWORK_FEE;

    // Calculate token amount after fees
    const tokenAmount = (fiatAmount - depositFee) * exchangeRate;

    return {
      type: 'deposit',
      fiatCurrency: fiatCurrency.toUpperCase(),
      tokenCurrency: tokenCurrency.toUpperCase(),
      fiatAmount,
      tokenAmount,
      fees: {
        deposit: depositFee,
        withdrawal: 0,
        network: networkFee,
      },
      estimatedTime: this.DEPOSIT_TIME,
      status: 'completed', // Instant for demo; would be 'pending' in production
      sep24Url: `https://testanchor.stellar.org/sep24/transactions/deposit/interactive`, // Example SEP-24 URL
    };
  }

  /**
   * Simulate Withdrawal: Token → Fiat
   *
   * Flow:
   * 1. User initiates withdrawal from wallet
   * 2. Anchor receives tokens on Stellar
   * 3. Anchor burns/holds tokens
   * 4. Anchor deducts withdrawal fee
   * 5. Anchor sends fiat to user's bank account
   *
   * @param tokenCurrency - Source token on Stellar (INRTEST, USDTEST, etc.)
   * @param fiatCurrency - Target fiat currency (INR, USD, etc.)
   * @param tokenAmount - Amount of tokens to withdraw
   * @returns Simulation result with fees and amounts
   */
  async simulateWithdrawal(
    tokenCurrency: string,
    fiatCurrency: string,
    tokenAmount: number
  ): Promise<AnchorSimulation> {
    if (!this.supportsCurrency(fiatCurrency)) {
      throw new Error(`Anchor does not support ${fiatCurrency}`);
    }

    // Get real-time exchange rate from FX service
    const tokenBaseCurrency = tokenCurrency.replace('TEST', '').toUpperCase();

    // If token base matches fiat currency, use 1:1 peg (e.g., INRTEST → INR)
    // Otherwise, convert using real FX rates (e.g., USDTEST → INR needs USD/INR rate)
    let exchangeRate = 1;
    if (fiatCurrency.toUpperCase() !== tokenBaseCurrency) {
      try {
        exchangeRate = await fxRateService.getRate(tokenBaseCurrency, fiatCurrency);
        console.log(`✅ Anchor withdrawal rate: 1 ${tokenBaseCurrency} = ${exchangeRate} ${fiatCurrency} (real-time)`);
      } catch (error) {
        console.warn(`⚠️  Could not fetch rate for ${tokenBaseCurrency}/${fiatCurrency}, using 1:1 fallback`);
        exchangeRate = 1;
      }
    }

    // Calculate fees
    const fiatBeforeFees = tokenAmount * exchangeRate;
    const withdrawalFee = fiatBeforeFees * this.WITHDRAWAL_FEE_PERCENT;
    const networkFee = this.NETWORK_FEE;

    // Calculate fiat amount after fees
    const fiatAmount = fiatBeforeFees - withdrawalFee;

    return {
      type: 'withdrawal',
      fiatCurrency: fiatCurrency.toUpperCase(),
      tokenCurrency: tokenCurrency.toUpperCase(),
      fiatAmount,
      tokenAmount,
      fees: {
        deposit: 0,
        withdrawal: withdrawalFee,
        network: networkFee,
      },
      estimatedTime: this.WITHDRAWAL_TIME,
      status: 'completed', // Instant for demo; would be 'pending' in production
      sep24Url: `https://testanchor.stellar.org/sep24/transactions/withdraw/interactive`, // Example SEP-24 URL
    };
  }

  /**
   * Check if anchor supports a given fiat currency
   *
   * @param fiatCurrency - Currency code to check (INR, USD, etc.)
   * @returns true if supported, false otherwise
   */
  supportsCurrency(fiatCurrency: string): boolean {
    return this.SUPPORTED_CURRENCIES.includes(fiatCurrency.toUpperCase());
  }

  /**
   * Get list of supported currencies
   *
   * @returns Array of supported currency codes
   */
  getSupportedCurrencies(): string[] {
    return [...this.SUPPORTED_CURRENCIES];
  }

  /**
   * Get fee structure for transparency
   *
   * @returns Object with fee percentages and fixed fees
   */
  getFeeStructure() {
    return {
      deposit: {
        percent: this.DEPOSIT_FEE_PERCENT * 100,
        description: 'Bank/card processing fee',
      },
      withdrawal: {
        percent: this.WITHDRAWAL_FEE_PERCENT * 100,
        description: 'Bank transfer fee',
      },
      network: {
        fixed: this.NETWORK_FEE,
        description: 'Stellar network transaction fee',
        asset: 'XLM',
      },
    };
  }
}

// Export singleton instance
export const anchorSimulator = new AnchorSimulator();
