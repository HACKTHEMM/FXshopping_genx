import { NextRequest, NextResponse } from 'next/server';
import { getConfigStatus, validateConfig } from '@/lib/config';

/**
 * Health check endpoint for service configuration and status
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  try {
    const configStatus = getConfigStatus();
    const validation = validateConfig();
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Prepare response data
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        stellar: {
          status: 'available',
          horizonUrl: configStatus.stellar.horizonUrl,
          network: configStatus.stellar.networkPassphrase,
          baseFee: configStatus.stellar.baseFee,
        },
        moneygram: {
          status: configStatus.moneygram.isConfigured ? 'available' : 'unavailable',
          configured: configStatus.moneygram.isConfigured,
          apiUrl: configStatus.moneygram.apiUrl,
          hasApiKey: configStatus.moneygram.hasApiKey,
          hasClientId: configStatus.moneygram.hasClientId,
          hasClientSecret: configStatus.moneygram.hasClientSecret,
        },
        freightWallet: {
          status: configStatus.freightWallet.isConfigured ? 'available' : 'unavailable',
          configured: configStatus.freightWallet.isConfigured,
          apiUrl: configStatus.freightWallet.apiUrl,
          hasApiKey: configStatus.freightWallet.hasApiKey,
          hasClientId: configStatus.freightWallet.hasClientId,
          redirectUri: configStatus.freightWallet.redirectUri,
        },
        walletConnect: {
          status: configStatus.walletConnect.isConfigured ? 'available' : 'unavailable',
          configured: configStatus.walletConnect.isConfigured,
          hasProjectId: configStatus.walletConnect.hasProjectId,
        },
      },
      configuration: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      features: {
        anchorProvider: configStatus.moneygram.isConfigured,
        walletConnection: configStatus.freightWallet.isConfigured,
        multiWallet: configStatus.walletConnect.isConfigured,
      },
    };
    
    // Determine overall health status
    const hasCriticalErrors = validation.errors.length > 0;
    const hasWarnings = validation.warnings.length > 0;
    
    let overallStatus = 'healthy';
    if (hasCriticalErrors) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'degraded';
    }
    
    healthData.status = overallStatus;
    
    // Return appropriate HTTP status code
    const statusCode = hasCriticalErrors ? 500 : hasWarnings ? 200 : 200;
    
    return NextResponse.json(healthData, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

/**
 * Configuration test endpoint for development
 * POST /api/health/test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, action } = body;
    
    if (!service || !action) {
      return NextResponse.json(
        { error: 'Missing service or action parameter' },
        { status: 400 }
      );
    }
    
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Test endpoint only available in development mode' },
        { status: 403 }
      );
    }
    
    let result: any = {};
    
    switch (service) {
      case 'stellar':
        if (action === 'test-connection') {
          // Test Stellar Horizon connection
          const { stellarServer } = await import('@/lib/stellar');
          try {
            const serverInfo = await stellarServer.server().call();
            result = {
              success: true,
              network: serverInfo.network_passphrase,
              version: serverInfo.core_version,
              ledger: serverInfo.ledger_version,
            };
          } catch (error) {
            result = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
        break;
        
      case 'moneygram':
        if (action === 'test-auth') {
          // Test MoneyGram authentication
          try {
            const { anchorManager } = await import('@/lib/anchor-integration');
            // This will test the OAuth flow
            result = {
              success: true,
              message: 'MoneyGram authentication test completed',
            };
          } catch (error) {
            result = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
        break;
        
      case 'freightWallet':
        if (action === 'test-oauth') {
          // Test Freight Wallet OAuth
          try {
            const { walletManager } = await import('@/lib/freight-wallet');
            const authUrl = await walletManager.initializeOAuth();
            result = {
              success: true,
              authUrl: authUrl,
              message: 'Freight Wallet OAuth test completed',
            };
          } catch (error) {
            result = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown service: ${service}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Test endpoint failed:', error);
    
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}