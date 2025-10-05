import { NextRequest, NextResponse } from 'next/server';
import { discoverRoutes } from '../../../../lib/route-optimizer';
import { PathPaymentQuery } from '../../../../lib/stellar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourceCurrency, 
      targetCurrency, 
      sourceAmount, 
      sourceAccount, 
      targetAccount 
    } = body;

    // Validate required fields
    if (!sourceCurrency || !targetCurrency || !sourceAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceCurrency, targetCurrency, sourceAmount' },
        { status: 400 }
      );
    }

    // Validate source amount
    const amount = parseFloat(sourceAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid source amount' },
        { status: 400 }
      );
    }

    // Validate currency codes
    const supportedCurrencies = ['XLM', 'USDC', 'USD', 'EUR', 'INR', 'PHP', 'GBP'];
    if (!supportedCurrencies.includes(sourceCurrency.toUpperCase()) ||
        !supportedCurrencies.includes(targetCurrency.toUpperCase())) {
      return NextResponse.json(
        { error: 'Unsupported currency pair' },
        { status: 400 }
      );
    }

    // Basic validation for demo
    if (sourceAccount && sourceAccount.length < 20) {
      return NextResponse.json(
        { error: 'Invalid source account address' },
        { status: 400 }
      );
    }

    if (targetAccount && targetAccount.length < 20) {
      return NextResponse.json(
        { error: 'Invalid target account address' },
        { status: 400 }
      );
    }

    // Use comprehensive route discovery
    const query: PathPaymentQuery = {
      sourceCurrency: sourceCurrency.toUpperCase(),
      targetCurrency: targetCurrency.toUpperCase(),
      sourceAmount: amount,
      sourceAccount,
      targetAccount
    };

    const { routes, summary } = await discoverRoutes(query, {
      includeStellar: true,
      includeAnchors: true,
      includeOffChain: true,
      sourceAccount,
      userPreferences: {
        prioritizeSpeed: false,
        prioritizeCost: true,
        maxRiskScore: 50,
        requireKYC: false
      }
    });

    const response = {
      success: true,
      query: {
        sourceCurrency: sourceCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
        sourceAmount: amount,
      },
      routes,
      summary,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in route search:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceCurrency = searchParams.get('sourceCurrency');
  const targetCurrency = searchParams.get('targetCurrency');
  const sourceAmount = searchParams.get('sourceAmount');

  if (!sourceCurrency || !targetCurrency || !sourceAmount) {
    return NextResponse.json(
      { error: 'Missing required query parameters' },
      { status: 400 }
    );
  }

  // Redirect to POST with query parameters
  const body = {
    sourceCurrency,
    targetCurrency,
    sourceAmount: parseFloat(sourceAmount),
  };

  // Create a new NextRequest with the same properties
  const newRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return POST(newRequest);
}
