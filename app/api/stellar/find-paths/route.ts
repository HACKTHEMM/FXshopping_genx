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

    // Source asset parameters (always needed)
    if (source.type === 'native') {
      params.append('source_asset_type', 'native');
    } else {
      // Stellar uses credit_alphanum4 for codes 1-4 chars, credit_alphanum12 for 5-12 chars
      const sourceAssetType = source.code && source.code.length <= 4 
        ? 'credit_alphanum4' 
        : 'credit_alphanum12';
      params.append('source_asset_type', sourceAssetType);
      if (source.code) params.append('source_asset_code', source.code);
      if (source.issuer) params.append('source_asset_issuer', source.issuer);
    }

    // Amount parameter (different field names for send vs receive)
    if (type === 'send') {
      params.append('source_amount', amount);
      
      // For strict-send, use destination_assets parameter (comma-separated list)
      if (dest.type === 'native') {
        params.append('destination_assets', 'native');
      } else if (dest.code && dest.issuer) {
        params.append('destination_assets', `${dest.code}:${dest.issuer}`);
      }
    } else {
      // For strict-receive, use individual destination asset parameters
      if (dest.type === 'native') {
        params.append('destination_asset_type', 'native');
      } else {
        const destAssetType = dest.code && dest.code.length <= 4 
          ? 'credit_alphanum4' 
          : 'credit_alphanum12';
        params.append('destination_asset_type', destAssetType);
        if (dest.code) params.append('destination_asset_code', dest.code);
        if (dest.issuer) params.append('destination_asset_issuer', dest.issuer);
      }
      
      params.append('destination_amount', amount);
    }

    const url = `${HORIZON_URL}${endpoint}?${params.toString()}`;
    console.log('Querying Horizon:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Horizon API Error:', JSON.stringify(errorData, null, 2));
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

    // If no paths found via path payment API, try orderbook directly
    if (paths.length === 0 && type === 'send' && source.type !== 'native' && dest.type !== 'native') {
      console.log('No paths found, checking orderbook directly...');
      
      try {
        const orderbookUrl = `${HORIZON_URL}/order_book?` + 
          `selling_asset_type=${source.code && source.code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12'}&` +
          `selling_asset_code=${source.code}&` +
          `selling_asset_issuer=${source.issuer}&` +
          `buying_asset_type=${dest.code && dest.code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12'}&` +
          `buying_asset_code=${dest.code}&` +
          `buying_asset_issuer=${dest.issuer}`;
        
        const orderbookResponse = await fetch(orderbookUrl);
        
        if (orderbookResponse.ok) {
          const orderbookData = await orderbookResponse.json();
          const asks = orderbookData.asks || [];
          
          if (asks.length > 0) {
            // Build a synthetic path from orderbook
            const bestAsk = asks[0];
            const rate = parseFloat(bestAsk.price);
            const destAmount = parseFloat(amount) * rate;
            
            const syntheticPath = {
              source_asset_type: (source.code && source.code.length <= 4) ? 'credit_alphanum4' : 'credit_alphanum12',
              source_asset_code: source.code || '',
              source_asset_issuer: source.issuer || '',
              source_amount: amount,
              destination_asset_type: (dest.code && dest.code.length <= 4) ? 'credit_alphanum4' : 'credit_alphanum12',
              destination_asset_code: dest.code || '',
              destination_asset_issuer: dest.issuer || '',
              destination_amount: destAmount.toFixed(7),
              path: [], // Direct trade, no intermediate hops
            };
            
            paths.push(syntheticPath);
            console.log(`✅ Built synthetic path from orderbook: ${amount} ${source.code} → ${destAmount.toFixed(2)} ${dest.code} @ ${rate}`);
          }
        }
      } catch (orderbookError) {
        console.error('Orderbook query failed:', orderbookError);
      }
    }

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
