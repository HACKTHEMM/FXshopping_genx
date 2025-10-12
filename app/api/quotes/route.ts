import { NextRequest, NextResponse } from 'next/server';
import { ProviderQuote, RouteFee } from '@/lib/types/route';
import { fxRateService } from '@/lib/fx-rates';
import { PROVIDER_FEE_STRUCTURES, calculateProviderFee, getProvidersForCurrencyPair } from '@/lib/provider-fee-structures';

/**
 * FX Provider Quotes API
 * Uses real provider fee structures (Wise, MoneyGram, Western Union, etc.)
 * with real-time FX rates from ExchangeRate-API
 * GET /api/quotes?from=INR&to=USD&amount=10000
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();
    const amount = searchParams.get('amount');

    if (!from || !to || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to, amount' },
        { status: 400 }
      );
    }

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get real-time exchange rate from FX API
    let baseRate: number;
    let rateTimestamp: Date;
    let rateSource: string;

    try {
      const conversionResult = await fxRateService.convert(from, to, 1);
      baseRate = conversionResult.rate;
      rateTimestamp = conversionResult.timestamp;
      rateSource = 'ExchangeRate-API (live)';

      console.log(`📊 FX Rate: ${from} → ${to} = ${baseRate.toFixed(3)} (${rateSource})`);
    } catch (error: any) {
      console.error('Failed to fetch FX rate:', error.message);
      return NextResponse.json(
        { error: `Exchange rate not available for ${from} to ${to}`, details: error.message },
        { status: 400 }
      );
    }

    // Get providers that support this currency pair
    const supportedProviders = getProvidersForCurrencyPair(from, to);

    console.log(`📋 Found ${supportedProviders.length} providers for ${from}→${to}`);

    // Generate quotes from each real provider
    const quotes: ProviderQuote[] = supportedProviders.map((provider) => {
      const feeCalc = calculateProviderFee(provider.id, sendAmount, baseRate);

      // Build detailed fee array
      const fees: RouteFee[] = [];

      if (feeCalc.flatFee > 0) {
        fees.push({
          kind: 'flat_fee',
          amount: feeCalc.flatFee,
          asset: to,
          note: `${provider.name} service charge`,
        });
      }

      if (feeCalc.percentageFee > 0) {
        fees.push({
          kind: 'provider_fee',
          amount: feeCalc.percentageFee,
          asset: to,
          note: `${provider.baseFeePercent}% processing fee`,
        });
      }

      if (provider.spreadPercent > 0) {
        fees.push({
          kind: 'spread',
          amount: sendAmount * baseRate * (provider.spreadPercent / 100),
          asset: to,
          note: `${provider.spreadPercent}% exchange rate markup`,
        });
      }

      // For Stellar on-chain, minimal network fee
      if (provider.id === 'stellar-onchain') {
        fees.push({
          kind: 'network',
          amount: 0.00001,
          asset: 'XLM',
          note: 'Stellar network fee (~100 stroops)',
        });
      }

      return {
        providerId: provider.id,
        providerName: provider.name,
        sourceCurrency: from,
        destCurrency: to,
        sendAmount,
        receiveAmount: parseFloat(feeCalc.receiveAmount.toFixed(2)),
        exchangeRate: parseFloat(feeCalc.effectiveRate.toFixed(3)),
        fees,
        estimatedTime: provider.estimatedTime,
        expiresAt: new Date(Date.now() + 60000), // 1 minute expiry
      };
    });

    const allQuotes = quotes;

    // Sort by net receive (best first)
    allQuotes.sort((a, b) => b.receiveAmount - a.receiveAmount);

    return NextResponse.json({
      success: true,
      quoteCount: allQuotes.length,
      quotes: allQuotes,
      baseRate,
      rateSource,
      rateTimestamp: rateTimestamp.toISOString(),
      from,
      to,
      amount: sendAmount,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Quotes API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}
