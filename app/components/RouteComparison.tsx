'use client';

import { useState } from 'react';
import { RouteQuote, RouteLeg } from '@/lib/types/route';

interface RouteComparisonProps {
  routes: RouteQuote[];
  onSelectRoute?: (route: RouteQuote) => void;
  rateMetadata?: {
    rateSource?: string;
    rateTimestamp?: string;
    baseRate?: number;
  };
}

export default function RouteComparison({ routes, onSelectRoute, rateMetadata }: RouteComparisonProps) {
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

        {/* Data Transparency Banner */}
        <div className="mt-3 md:mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-gray-700"><strong>REAL:</strong> Stellar DEX paths, FX rates, network fees</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-gray-700"><strong>CUSTOM ASSETS:</strong> Demo tokens (anchor infrastructure ready)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-gray-700"><strong>ESTIMATED:</strong> Traditional provider quotes</span>
            </div>
          </div>
        </div>

        {/* Rate Metadata */}
        {rateMetadata && (
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm">
              {rateMetadata.rateSource && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">✅ Real FX Rates from:</span> {rateMetadata.rateSource}
                  </span>
                </div>
              )}
              {rateMetadata.rateTimestamp && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Updated:</span>{' '}
                    {new Date(rateMetadata.rateTimestamp).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Routes */}
      <div className="space-y-3 md:space-y-4">
        {routes.map((route, index) => {
          const isExpanded = expandedRouteId === route.routeId;
          const isBest = index === 0;

          // Calculate minimum receive amounts with slippage for accurate comparison
          const minReceive = route.netReceive * (1 - route.slippagePct / 100);
          const worstMinReceive = worstRoute.netReceive * (1 - worstRoute.slippagePct / 100);

          const savingsAmount = minReceive - worstMinReceive;
          const savingsPercent = worstMinReceive > 0
            ? ((savingsAmount / worstMinReceive) * 100).toFixed(2)
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
                    <div className="text-xs text-gray-500 mb-1">
                      They Receive <span className="text-[10px] text-gray-400">(minimum)</span>
                    </div>
                    <div className="text-lg md:text-xl font-bold text-green-600 truncate">
                      {(route.netReceive * (1 - route.slippagePct / 100)).toFixed(2)} <span className="text-sm md:text-base">{route.destinationFiat || route.destAsset.code}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Expected: ~{route.netReceive.toFixed(2)} (with {route.slippagePct}% slippage buffer)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Exchange Rate</div>
                    <div className="text-lg md:text-xl font-bold text-black">
                      {route.effectiveRate.toFixed(3)}
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

                {/* Liquidity Warning */}
                {route.references?.liquidityWarning && (
                  <div className="mb-3 md:mb-4">
                    <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 px-2.5 md:px-3 py-2 md:py-2.5 rounded">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs md:text-sm font-medium text-yellow-800 mb-1">Low Liquidity Warning</div>
                        <div className="text-xs text-yellow-700 break-words">{route.references.liquidityWarning}</div>
                      </div>
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
                        {route.legs.map((leg, legIndex) => {
                          const isAnchorLeg = leg.type === 'anchor-deposit' || leg.type === 'anchor-withdraw';
                          const isStellarDex = leg.type === 'stellar-path';
                          const isOffchainQuote = leg.type === 'offchain-quote';

                          return (
                            <div
                              key={legIndex}
                              className={`flex items-start space-x-2 md:space-x-3 text-xs md:text-sm ${
                                isAnchorLeg
                                  ? 'bg-purple-50 border border-purple-200 p-2 md:p-3 rounded'
                                  : isStellarDex
                                  ? 'bg-green-50 border border-green-200 p-2 md:p-3 rounded'
                                  : isOffchainQuote
                                  ? 'bg-yellow-50 border border-yellow-200 p-2 md:p-3 rounded'
                                  : 'p-2 md:p-3'
                              }`}
                            >
                              <div className={`flex-shrink-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold text-[10px] md:text-xs ${
                                isAnchorLeg
                                  ? 'bg-purple-100 text-purple-700'
                                  : isStellarDex
                                  ? 'bg-green-100 text-green-700'
                                  : isOffchainQuote
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {legIndex + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <div className="font-medium text-black break-words">
                                    {leg.from} → {leg.to}
                                  </div>
                                  {isAnchorLeg && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-purple-600 text-white rounded">
                                      🟣 CUSTOM ASSET
                                    </span>
                                  )}
                                  {isStellarDex && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-green-600 text-white rounded">
                                      ✅ FROM TESTNET
                                    </span>
                                  )}
                                  {isOffchainQuote && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-yellow-600 text-white rounded">
                                      📊 ESTIMATED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
                                  <div className="break-words">Provider: {leg.provider || 'N/A'}</div>
                                  <div>Rate: {leg.rate.toFixed(3)}</div>
                                  <div>Time: ~{leg.estSeconds}s ({leg.estSeconds < 60 ? 'instant' : leg.estSeconds < 3600 ? `${Math.floor(leg.estSeconds / 60)}min` : `${Math.floor(leg.estSeconds / 3600)}hr`})</div>
                                  {leg.fees.length > 0 && (
                                    <div className="break-words">
                                      Fees: {leg.fees.map(f => `${f.amount.toFixed(4)} ${f.asset} (${f.note || f.kind})`).join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

      {/* Comprehensive Data Transparency Disclaimer */}
      {routes.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 p-4 md:p-6 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base md:text-lg font-bold text-gray-900 mb-3">
                🔍 Data Transparency & Sources
              </h4>

              {/* What's REAL */}
              <div className="mb-4">
                <h5 className="text-sm md:text-base font-bold text-green-700 mb-2">✅ REAL DATA (From Stellar Testnet & Live APIs):</h5>
                <ul className="text-xs md:text-sm text-gray-700 space-y-1.5 ml-4">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Stellar DEX Paths:</strong> Real orderbook data from <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px] md:text-xs">horizon-testnet.stellar.org</code></span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>FX Base Rates:</strong> Live mid-market rates from ExchangeRate-API (updated daily, 163 currencies)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Test Assets:</strong> INRTEST, USDTEST deployed on Stellar testnet with real liquidity pools</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Network Fees:</strong> Actual Stellar network fees (100 stroops = ~$0.000003)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Transaction Signing:</strong> Real Freighter wallet integration for testnet transactions</span>
                  </li>
                </ul>
              </div>

              {/* What's CUSTOM ASSETS (Demo) */}
              {routes.some(r => r.legs.some(l => l.type === 'anchor-deposit' || l.type === 'anchor-withdraw')) && (
                <div className="mb-4">
                  <h5 className="text-sm md:text-base font-bold text-purple-700 mb-2">🟣 CUSTOM ASSETS (Demo Tokens):</h5>
                  <ul className="text-xs md:text-sm text-gray-700 space-y-1.5 ml-4">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>What They Are:</strong> INRTEST and USDTEST are custom assets issued on Stellar testnet (not full anchors)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Fiat Conversion:</strong> INR/USD ↔ Token conversion uses real FX rates but is simulated for demo purposes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>For Production:</strong> Would need SEP-6/24/31 endpoints, stellar.toml file, KYC flows, and banking integration</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Fee Structure:</strong> 0.2% deposit fee, 0.5% withdrawal fee (typical anchor fees)</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* What's ESTIMATED */}
              {routes.some(r => r.legs.some(l => l.type === 'offchain-quote')) && (
                <div className="mb-4">
                  <h5 className="text-sm md:text-base font-bold text-yellow-700 mb-2">📊 ESTIMATED (Static Pricing Models):</h5>
                  <ul className="text-xs md:text-sm text-gray-700 space-y-1.5 ml-4">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Traditional Provider Quotes:</strong> Based on 2025 public pricing pages (Wise, MoneyGram, Western Union, Remitly)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Accuracy:</strong> Reasonably accurate for comparison purposes, but not real-time API quotes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span><strong>Fee Structures:</strong> Real fee percentages and flat fees from provider websites</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Learn More */}
              <div className="pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  <strong>Learn more:</strong>{' '}
                  <a href="https://stellar.org/ecosystem/sep-24" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">SEP-24 Anchors</a>
                  {' • '}
                  <a href="https://horizon-testnet.stellar.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Stellar Testnet</a>
                  {' • '}
                  <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Freighter Wallet</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
