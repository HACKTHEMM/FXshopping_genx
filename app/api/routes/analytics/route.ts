/**
 * API Route: Contract Analytics
 * 
 * GET /api/routes/analytics
 * 
 * Get contract-wide statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContractStats } from '@/lib/soroban-integration';
import { smartContract } from '@/lib/smart-contract';

// Type definitions for response structure
interface ContractStatsResponse {
  totalRoutes: number;
  totalUsers: number;
  finalizedRoutes: number;
  failedRoutes: number;
  pendingRoutes: number;
  successRate: string;
  averageVariance: string;
}

interface AnalyticsInsights {
  health: string;
  slippageQuality: string;
}

interface RoutesByStatus {
  registered: number;
  finalized: number;
  failed: number;
}

interface VarianceDistribution {
  betterThanExpected: number;
  asExpected: number;
  worseThanExpected: number;
}

interface RecentRouteItem {
  routeId: string;
  status: string;
  expectedNet: number;
  actualNet: number | null;
  variancePct: number | null;
  registeredAt: Date;
}

interface DetailedAnalytics {
  routesByStatus: RoutesByStatus;
  varianceDistribution: VarianceDistribution;
  recentRoutes: RecentRouteItem[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Get contract statistics
    const stats = await getContractStats();

    const response: {
      success: boolean;
      contractStats: ContractStatsResponse;
      insights: AnalyticsInsights;
      detailed?: DetailedAnalytics;
    } = {
      success: true,
      contractStats: {
        totalRoutes: stats.totalRoutes,
        totalUsers: stats.totalUsers,
        finalizedRoutes: stats.finalizedRoutes,
        failedRoutes: stats.failedRoutes,
        pendingRoutes: stats.pendingRoutes,
        successRate: stats.finalizedRoutes > 0
          ? ((stats.finalizedRoutes / (stats.finalizedRoutes + stats.failedRoutes)) * 100).toFixed(2) + '%'
          : '0%',
        averageVariance: stats.averageVariancePct.toFixed(2) + '%',
      },
      insights: {
        health:
          stats.totalRoutes > 0 && stats.finalizedRoutes / stats.totalRoutes > 0.8
            ? '🌟 Excellent - High completion rate'
            : stats.totalRoutes > 0 && stats.finalizedRoutes / stats.totalRoutes > 0.5
            ? '✅ Good - Most routes completing'
            : '⚠️ Needs Attention - Many pending/failed routes',
        slippageQuality:
          Math.abs(stats.averageVariancePct) < 1
            ? '✅ Excellent - Routes performing as expected'
            : Math.abs(stats.averageVariancePct) < 3
            ? '⚠️ Fair - Some variance detected'
            : '❌ Poor - High variance, check liquidity',
      },
    };

    // Include detailed data if requested
    if (detailed) {
      const allRoutes = smartContract.getAllRoutes();
      
      // Group routes by status
      const routesByStatus = {
        registered: allRoutes.filter(r => r.status === 'registered'),
        finalized: allRoutes.filter(r => r.status === 'finalized'),
        failed: allRoutes.filter(r => r.status === 'failed'),
      };

      // Calculate variance distribution
      const finalizedRoutes = routesByStatus.finalized;
      const varianceDistribution = {
        betterThanExpected: finalizedRoutes.filter(r => (r.variancePct || 0) > 0).length,
        asExpected: finalizedRoutes.filter(r => Math.abs(r.variancePct || 0) < 0.1).length,
        worseThanExpected: finalizedRoutes.filter(r => (r.variancePct || 0) < 0).length,
      };

      response.detailed = {
        routesByStatus: {
          registered: routesByStatus.registered.length,
          finalized: routesByStatus.finalized.length,
          failed: routesByStatus.failed.length,
        },
        varianceDistribution,
        recentRoutes: allRoutes
          .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
          .slice(0, 10)
          .map(r => ({
            routeId: r.routeId.substring(0, 8) + '...',
            status: r.status,
            expectedNet: r.expectedNet,
            actualNet: r.actualNet,
            variancePct: r.variancePct,
            registeredAt: r.registeredAt,
          })),
      };
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query contract analytics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
