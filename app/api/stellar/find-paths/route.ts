import { NextRequest, NextResponse } from 'next/server';
import { HorizonPathResult } from '@/lib/types/route';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';

/**
 * Stellar Path Payment Discovery API
 * Queries Horizon for path payment options between two assets
 * GET /api/stellar/find-paths?sourceAsset=XLM&destAsset=USDC:ISSUER&amount=100&type=send
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const sourceAsset = searchParams.get('sourceAsset');
    const destAsset = searchParams.get('destAsset');
    const amount = searchParams.get('amount');
    const type = searchParams.get('type') || 'send'; // 'send' or 'receive'
    const sourceAccount = searchParams.get('sourceAccount');
    const destAccount = searchParams.get('destAccount');

    if (!sourceAsset || !destAsset || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: sourceAsset, destAsset, amount' },
        { status: 400 }
      );
    }

    // Parse asset format: "CODE" for XLM or "CODE:ISSUER" for issued assets
    const parseAsset = (assetStr: string) => {
      if (assetStr === 'XLM' || assetStr.toUpperCase() === 'NATIVE') {
        return { type: 'native' };
      }
      const [code, issuer] = assetStr.split(':');
      if (!issuer) {
        throw new Error(`Invalid asset format: ${assetStr}. Use CODE:ISSUER for issued assets.`);
      }
      return { code, issuer };
    };

    const source = parseAsset(sourceAsset);
    const dest = parseAsset(destAsset);

    // Build Horizon query parameters
    const endpoint = type === 'send' ? '/paths/strict-send' : '/paths/strict-receive';
    const params = new URLSearchParams();

    // Source asset parameters
    if (source.type === 'native') {
      params.append('source_asset_type', 'native');
    } else {
      params.append('source_asset_type', 'credit_alphanum4'); // Adjust based on code length
      if (source.code) params.append('source_asset_code', source.code);
      if (source.issuer) params.append('source_asset_issuer', source.issuer);
    }

    // Destination asset parameters
    if (dest.type === 'native') {
      params.append('destination_asset_type', 'native');
    } else {
      params.append('destination_asset_type', 'credit_alphanum4');
      if (dest.code) params.append('destination_asset_code', dest.code);
      if (dest.issuer) params.append('destination_asset_issuer', dest.issuer);
    }

    // Amount parameter (different field names for send vs receive)
    if (type === 'send') {
      params.append('source_amount', amount);
      if (destAccount) {
        params.append('destination_account', destAccount);
      }
    } else {
      params.append('destination_amount', amount);
      if (sourceAccount) {
        params.append('source_account', sourceAccount);
      }
    }

    const url = `${HORIZON_URL}${endpoint}?${params.toString()}`;
    console.log('Querying Horizon:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { 
          error: 'Horizon API error', 
          details: errorData,
          url 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const paths = data._embedded?.records || [];

    // Transform and enrich path data
    const enrichedPaths = paths.map((path: HorizonPathResult, index: number) => {
      const sourceAmount = parseFloat(path.source_amount);
      const destAmount = parseFloat(path.destination_amount);
      const rate = sourceAmount > 0 ? destAmount / sourceAmount : 0;
      
      return {
        pathId: `path-${index}`,
        source: {
          type: path.source_asset_type,
          code: path.source_asset_code || 'XLM',
          issuer: path.source_asset_issuer,
          amount: sourceAmount,
        },
        destination: {
          type: path.destination_asset_type,
          code: path.destination_asset_code || 'XLM',
          issuer: path.destination_asset_issuer,
          amount: destAmount,
        },
        path: path.path.map((asset) => ({
          type: asset.asset_type,
          code: asset.asset_code || 'XLM',
          issuer: asset.asset_issuer,
        })),
        effectiveRate: rate,
        hops: path.path.length + 1,
        raw: path,
      };
    });

    return NextResponse.json({
      success: true,
      pathCount: enrichedPaths.length,
      paths: enrichedPaths,
      source: sourceAsset,
      destination: destAsset,
      amount: parseFloat(amount),
      type,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Path discovery error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}
