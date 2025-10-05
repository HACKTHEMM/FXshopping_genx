import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const transactionHash = searchParams.get('transactionHash');

    if (!transactionId && !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required parameter: transactionId or transactionHash' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll simulate transaction status lookup
    // In production, this would query the actual blockchain or provider APIs
    
    const mockStatus = generateMockTransactionStatus(transactionId || transactionHash);

    const response = {
      success: true,
      transaction: {
        id: transactionId,
        hash: transactionHash,
        status: mockStatus.status,
        sourceAccount: 'GCKFBEIYTKPQY5H...',
        targetAccount: 'GBKFBEIYTKPQY5H...',
        sourceCurrency: 'USD',
        targetCurrency: 'INR',
        sourceAmount: 1000,
        targetAmount: 83250,
        fees: {
          stellarFee: 0.00001,
          providerFee: 2.5,
          totalFees: 2.50001,
        },
        netRecipientAmount: 83247.49999,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
        confirmations: mockStatus.confirmations,
        network: mockStatus.network,
        memo: 'Payment via StellarFX Shopper',
      },
      execution: {
        method: mockStatus.method,
        estimatedTime: mockStatus.estimatedTime,
        actualTime: mockStatus.actualTime,
        confirmationBlocks: mockStatus.confirmationBlocks,
      },
      tracking: {
        stellarExplorerUrl: `https://stellar.expert/explorer/testnet/tx/${transactionHash || 'mock_hash'}`,
        providerTrackingUrl: transactionId ? `https://provider.example.com/track/${transactionId}` : null,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking transaction status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check transaction status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateMockTransactionStatus(identifier: string | null): {
  status: 'pending' | 'processing' | 'success' | 'failed' | 'completed';
  confirmations: number;
  network: 'testnet' | 'offchain';
  method: string;
  estimatedTime: string;
  actualTime: string;
  confirmationBlocks: number | null;
} {
  const statuses: Array<'pending' | 'processing' | 'success' | 'failed' | 'completed'> = 
    ['pending', 'processing', 'success', 'failed', 'completed'];
  
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  // Generate mock data based on status
  switch (randomStatus) {
    case 'pending':
      return {
        status: 'pending',
        confirmations: 0,
        network: 'testnet',
        method: 'stellar_path_payment',
        estimatedTime: 'instant',
        actualTime: 'pending',
        confirmationBlocks: null,
      };
    
    case 'processing':
      return {
        status: 'processing',
        confirmations: Math.floor(Math.random() * 2),
        network: 'offchain',
        method: 'offchain_fx_provider',
        estimatedTime: '1-2 business days',
        actualTime: 'processing',
        confirmationBlocks: null,
      };
    
    case 'success':
      return {
        status: 'success',
        confirmations: 1,
        network: 'testnet',
        method: 'stellar_path_payment',
        estimatedTime: 'instant',
        actualTime: '2.1s',
        confirmationBlocks: 1,
      };
    
    case 'failed':
      return {
        status: 'failed',
        confirmations: 0,
        network: 'testnet',
        method: 'stellar_path_payment',
        estimatedTime: 'instant',
        actualTime: 'failed',
        confirmationBlocks: null,
      };
    
    case 'completed':
      return {
        status: 'completed',
        confirmations: Math.floor(Math.random() * 10) + 5,
        network: 'offchain',
        method: 'offchain_fx_provider',
        estimatedTime: '1-2 business days',
        actualTime: '1.2 days',
        confirmationBlocks: null,
      };
    
    default:
      return {
        status: 'pending',
        confirmations: 0,
        network: 'testnet',
        method: 'stellar_path_payment',
        estimatedTime: 'instant',
        actualTime: 'pending',
        confirmationBlocks: null,
      };
  }
}
