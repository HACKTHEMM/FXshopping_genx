/**
 * API Route: User Statistics
 * 
 * GET /api/routes/stats?user=GXXXXXX
 * 
 * Query user's transaction statistics from the smart contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserStatsData, getUserRouteHistory } from '@/lib/soroban-integration';

// Type definitions for response structure
interface UserStatsResponse {
  totalRoutes: number;
  successfulRoutes: number;
  failedRoutes: number;
  pendingRoutes: number;
  totalVolumeSent: number;
  averageSuccessRate: string;
  averageVariance: string;
  lastActivity: Date;
}

interface UserInsights {
  performance: string;
  slippageProfile: string;
}

interface RouteHistoryItem {
  routeId: string;
  expectedNet: number;
  actualNet: number | null;
  status: string;
  variancePct: number | null;
  registeredAt: Date;
  finalizedAt: Date | null;
  txHash: string | null;
}

interface PaginationInfo {
  offset: number;
  limit: number;
  returned: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: user' },
        { status: 400 }
      );
    }

    // Validate Stellar public key
    if (!userAddress.startsWith('G') || userAddress.length !== 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar public key format' },
        { status: 400 }
      );
    }

    // Get user statistics
    const stats = await getUserStatsData(userAddress);

    if (!stats) {
      return NextResponse.json({
        success: true,
        user: userAddress,
        stats: null,
        message: 'No statistics found for this user (no routes registered yet)',
      });
    }

    const response: {
      success: boolean;
      user: string;
      stats: UserStatsResponse;
      insights: UserInsights;
      routeHistory?: RouteHistoryItem[];
      pagination?: PaginationInfo;
    } = {
      success: true,
      user: userAddress,
      stats: {
        totalRoutes: stats.totalRoutes,
        successfulRoutes: stats.successfulRoutes,
        failedRoutes: stats.failedRoutes,
        pendingRoutes: stats.totalRoutes - stats.successfulRoutes - stats.failedRoutes,
        totalVolumeSent: stats.totalVolumeSent,
        averageSuccessRate: stats.averageSuccessRate.toFixed(2) + '%',
        averageVariance: stats.averageVariancePct.toFixed(2) + '%',
        lastActivity: stats.lastRouteAt,
      },
      insights: {
        performance:
          stats.averageSuccessRate >= 90
            ? '🌟 Excellent'
            : stats.averageSuccessRate >= 75
            ? '✅ Good'
            : stats.averageSuccessRate >= 50
            ? '⚠️ Needs Improvement'
            : '❌ Poor',
        slippageProfile:
          Math.abs(stats.averageVariancePct) < 1
            ? '✅ Low slippage (excellent routes)'
            : Math.abs(stats.averageVariancePct) < 3
            ? '⚠️ Moderate slippage'
            : '❌ High slippage (consider better routes)',
      },
    };

    // Include route history if requested
    if (includeHistory) {
      const history = await getUserRouteHistory(userAddress, offset, limit);
      response.routeHistory = history.map(route => ({
        routeId: route.routeId,
        expectedNet: route.expectedNet,
        actualNet: route.actualNet,
        status: route.status,
        variancePct: route.variancePct,
        registeredAt: route.registeredAt,
        finalizedAt: route.finalizedAt,
        txHash: route.txHash,
      }));
      response.pagination = {
        offset,
        limit,
        returned: history.length,
      };
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query user statistics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
