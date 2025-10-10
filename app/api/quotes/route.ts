import { NextRequest, NextResponse } from 'next/server';
import { ProviderQuote, RouteFee } from '@/lib/types/route';
import { fxRateService } from '@/lib/fx-rates';

/**
 * FX Provider Quotes API
 * Simulates 3 different off-chain FX providers with varying rates and fees
 * Uses real-time FX rates from ExchangeRate-API
 * GET /api/quotes?from=INR&to=USD&amount=10000
 */

interface MockProvider {
  id: string;
  name: string;
  speedTier: 'fast' | 'medium' | 'slow';
  baseFeePercent: number;
  flatFee: number;
  spreadPercent: number;
  reliabilityScore: number; // 0-1
}

const MOCK_PROVIDERS: MockProvider[] = [
  {
    id: 'provider-swift',
    name: 'SwiftFX',
    speedTier: 'slow',
    baseFeePercent: 0.5,
    flatFee: 3.0,
    spreadPercent: 1.2,
    reliabilityScore: 0.95,
  },
  {
    id: 'provider-wise',
    name: 'WiseTransfer',
    speedTier: 'medium',
    baseFeePercent: 0.8,
    flatFee: 2.0,
    spreadPercent: 0.8,
    reliabilityScore: 0.92,
  },
  {
    id: 'provider-express',
    name: 'ExpressRemit',
    speedTier: 'fast',
    baseFeePercent: 1.5,
    flatFee: 5.0,
    spreadPercent: 1.5,
    reliabilityScore: 0.88,
  },
];

// Note: Exchange rates now fetched from real API via fxRateService
// Fallback rates are maintained in lib/fx-rates.ts

const getSpeedEstimate = (tier: 'fast' | 'medium' | 'slow'): number => {
  switch (tier) {
    case 'fast': return 300; // 5 minutes
    case 'medium': return 3600; // 1 hour
    case 'slow': return 86400; // 24 hours
  }
};

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

      console.log(`📊 FX Rate: ${from} → ${to} = ${baseRate.toFixed(6)} (${rateSource})`);
    } catch (error: any) {
      console.error('Failed to fetch FX rate:', error.message);
      return NextResponse.json(
        { error: `Exchange rate not available for ${from} to ${to}`, details: error.message },
        { status: 400 }
      );
    }

    // Generate quotes from each provider
    const quotes: ProviderQuote[] = MOCK_PROVIDERS.map((provider) => {
      // Apply spread to base rate (provider's markup)
      const spreadMultiplier = 1 - (provider.spreadPercent / 100);
      const providerRate = baseRate * spreadMultiplier;

      // Calculate gross receive amount
      const grossReceive = sendAmount * providerRate;

      // Calculate fees
      const percentageFee = grossReceive * (provider.baseFeePercent / 100);
      const totalFee = percentageFee + provider.flatFee;

      // Net receive amount
      const netReceive = Math.max(0, grossReceive - totalFee);

      const fees: RouteFee[] = [
        {
          kind: 'provider_fee',
          amount: percentageFee,
          asset: to,
          note: `${provider.baseFeePercent}% processing fee`,
        },
        {
          kind: 'flat_fee',
          amount: provider.flatFee,
          asset: to,
          note: 'Service charge',
        },
        {
          kind: 'spread',
          amount: sendAmount * baseRate * (provider.spreadPercent / 100),
          asset: to,
          note: `${provider.spreadPercent}% exchange rate markup`,
        },
      ];

      // Add random small variance to make it more realistic
      const variance = 1 + (Math.random() - 0.5) * 0.02; // ±1%
      const finalNetReceive = netReceive * variance;

      return {
        providerId: provider.id,
        providerName: provider.name,
        sourceCurrency: from,
        destCurrency: to,
        sendAmount,
        receiveAmount: parseFloat(finalNetReceive.toFixed(2)),
        exchangeRate: parseFloat(providerRate.toFixed(6)),
        fees,
        estimatedTime: getSpeedEstimate(provider.speedTier),
        expiresAt: new Date(Date.now() + 60000), // 1 minute expiry
      };
    });

    // Also add an "on-chain synthetic" baseline (simulated Stellar path)
    const stellarRate = baseRate * 0.995; // Assume 0.5% better than worst provider
    const stellarReceive = sendAmount * stellarRate;
    const networkFee = 0.01; // Minimal Stellar fee
    
    const stellarQuote: ProviderQuote = {
      providerId: 'stellar-onchain',
      providerName: 'Stellar On-Chain Path',
      sourceCurrency: from,
      destCurrency: to,
      sendAmount,
      receiveAmount: parseFloat((stellarReceive - networkFee).toFixed(2)),
      exchangeRate: parseFloat(stellarRate.toFixed(6)),
      fees: [
        {
          kind: 'network',
          amount: networkFee,
          asset: to,
          note: 'Stellar network fee',
        },
      ],
      estimatedTime: 5, // ~5 seconds on Stellar
      expiresAt: new Date(Date.now() + 30000), // 30 second expiry (more volatile)
    };

    const allQuotes = [...quotes, stellarQuote];

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
