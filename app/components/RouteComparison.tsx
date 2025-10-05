'use client';

import { useState } from 'react';
import { RouteQuote, RouteLeg } from '@/lib/types/route';

interface RouteComparisonProps {
  routes: RouteQuote[];
  onSelectRoute?: (route: RouteQuote) => void;
}

export default function RouteComparison({ routes, onSelectRoute }: RouteComparisonProps) {
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  if (routes.length === 0) {
    return (
      <div className="bg-white border border-gray-200 p-8 md:p-12 text-center">
        <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm md:text-base text-gray-500">No routes to display. Submit the form to find routes.</p>
      </div>
    );
  }

  const bestRoute = routes[0];
  const worstRoute = routes[routes.length - 1];

  const toggleExpand = (routeId: string) => {
    setExpandedRouteId(expandedRouteId === routeId ? null : routeId);
  };

  const getRiskColor = (score: number): string => {
    if (score < 0.3) return 'text-green-600';
    if (score < 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLabel = (score: number): string => {
    if (score < 0.3) return 'Low Risk';
    if (score < 0.6) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-1 md:mb-2">Route Comparison</h2>
        <p className="text-xs md:text-sm text-gray-600">
          Found {routes.length} route{routes.length !== 1 ? 's' : ''} • Sorted by best payout
        </p>
      </div>

      {/* Routes */}
      <div className="space-y-3 md:space-y-4">
        {routes.map((route, index) => {
          const isExpanded = expandedRouteId === route.routeId;
          const isBest = index === 0;
          const savingsAmount = route.savingsVsBaseline || 0;
          const savingsPercent = worstRoute.netReceive > 0 
            ? ((savingsAmount / worstRoute.netReceive) * 100).toFixed(2)
            : '0';

          return (
            <div
              key={route.routeId}
              className={`bg-white border-2 transition-all ${
                isBest ? 'border-blue-500' : 'border-gray-200'
              } hover:shadow-md`}
            >
              {/* Best Route Badge */}
              {isBest && (
                <div className="bg-blue-500 text-white px-3 md:px-4 py-1.5 md:py-2 text-xs font-bold uppercase">
                  ⭐ Best Route
                </div>
              )}

              <div className="p-4 md:p-5">
                {/* Route Header */}
                <div className="flex items-start justify-between mb-3 md:mb-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-black mb-1 truncate">
                      {route.providerName || `Route ${index + 1}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs md:text-sm text-gray-600">
                      <span>{route.legs.length} step{route.legs.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>~{route.execution.estimatedConfirmationTime}s</span>
                      {route.execution.requiresKYC && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-yellow-600">KYC Required</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Risk Score */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs md:text-sm font-medium ${getRiskColor(route.riskScore)}`}>
                      {getRiskLabel(route.riskScore)}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500">
                      Score: {(route.riskScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Amount & Rate - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">You Send</div>
                    <div className="text-lg md:text-xl font-bold text-black truncate">
                      {route.grossSend.toLocaleString()} <span className="text-sm md:text-base">{route.sourceFiat || route.sendAsset.code}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">They Receive</div>
                    <div className="text-lg md:text-xl font-bold text-green-600 truncate">
                      {route.netReceive.toLocaleString()} <span className="text-sm md:text-base">{route.destinationFiat || route.destAsset.code}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Exchange Rate</div>
                    <div className="text-lg md:text-xl font-bold text-black">
                      {route.effectiveRate.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Savings Badge */}
                {savingsAmount > 0 && (
                  <div className="mb-3 md:mb-4">
                    <div className="inline-flex items-center bg-green-50 border border-green-200 px-2.5 md:px-3 py-1 md:py-1.5">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-green-600 mr-1.5 md:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs md:text-sm font-medium text-green-700">
                        Save {savingsAmount.toFixed(2)} {route.destinationFiat || route.destAsset.code} ({savingsPercent}% better)
                      </span>
                    </div>
                  </div>
                )}

                {/* Fee Summary */}
                <div className="flex items-center justify-between mb-3 md:mb-4 text-xs md:text-sm">
                  <span className="text-gray-600">Total Fees:</span>
                  <span className="font-medium text-black">
                    {route.totalFees.toFixed(4)} {route.destinationFiat || route.destAsset.code}
                  </span>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleExpand(route.routeId)}
                  className="w-full flex items-center justify-between text-xs md:text-sm text-blue-600 hover:text-blue-800 py-2 border-t border-gray-200 pt-3 md:pt-4"
                >
                  <span className="font-medium">
                    {isExpanded ? 'Hide' : 'Show'} Route Details
                  </span>
                  <svg
                    className={`w-4 h-4 md:w-5 md:h-5 transform transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200 space-y-3 md:space-y-4">
                    {/* Route Legs */}
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-black mb-2 md:mb-3">Route Steps:</h4>
                      <div className="space-y-2 md:space-y-3">
                        {route.legs.map((leg, legIndex) => (
                          <div key={legIndex} className="flex items-start space-x-2 md:space-x-3 text-xs md:text-sm">
                            <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] md:text-xs">
                              {legIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-black mb-1 break-words">
                                {leg.from} → {leg.to}
                              </div>
                              <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
                                <div className="break-words">Type: <span className="font-mono">{leg.type}</span></div>
                                <div className="break-words">Provider: {leg.provider || 'N/A'}</div>
                                <div>Rate: {leg.rate.toFixed(6)}</div>
                                <div>Time: ~{leg.estSeconds}s</div>
                                {leg.fees.length > 0 && (
                                  <div className="break-words">
                                    Fees: {leg.fees.map(f => `${f.amount.toFixed(4)} ${f.asset} (${f.kind})`).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Execution Info */}
                    <div className="bg-gray-50 p-3 md:p-4">
                      <h4 className="text-xs md:text-sm font-bold text-black mb-2">Execution Details:</h4>
                      <div className="space-y-1 text-[10px] md:text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Can Build XDR:</span>
                          <span className={route.execution.canBuildXDR ? 'text-green-600' : 'text-gray-400'}>
                            {route.execution.canBuildXDR ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contract Attestation:</span>
                          <span className={route.execution.contractAttestationSupported ? 'text-green-600' : 'text-gray-400'}>
                            {route.execution.contractAttestationSupported ? '✓ Supported' : '✗ Not Available'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Slippage Buffer:</span>
                          <span>{route.slippagePct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Select Route Button */}
                {onSelectRoute && (
                  <button
                    onClick={() => onSelectRoute(route)}
                    className="w-full mt-3 md:mt-4 bg-black text-white px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Select This Route
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
