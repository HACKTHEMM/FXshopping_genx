'use client';

import { useState } from 'react';
import { RouteQuote } from '@/lib/types/route';
import PaymentForm from './PaymentForm';
import RouteComparison from './RouteComparison';
import TestnetAnchor from './TestnetAnchor';
import WormholeBridge from './WormholeBridge';
import WormholeExample from './WormholeExample';
import TrustlineManager from './TrustlineManager';
import { connectFreighter, signWithFreighter, parseFreighterError } from '@/lib/freighter-integration';
import { buildPathPaymentTransaction, submitTransaction, hasTrustline, getBalance } from '@/lib/stellar-transaction';
import { WormholeRoute } from '@/lib/wormhole/types';

interface RoutesProps {
  publicKey?: string;
}

export default function Routes({ publicKey }: RoutesProps) {
  const [routes, setRoutes] = useState<RouteQuote[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteQuote | null>(null);
  const [rateMetadata, setRateMetadata] = useState<{
    rateSource?: string;
    rateTimestamp?: string;
    baseRate?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [connectedPublicKey, setConnectedPublicKey] = useState<string | null>(null);
  
  // Wormhole bridge state
  const [wormholeRoutes, setWormholeRoutes] = useState<WormholeRoute[]>([]);
  const [activeTab, setActiveTab] = useState<'stellar' | 'wormhole'>('stellar');

  const handleRoutesFound = (foundRoutes: RouteQuote[], metadata?: {
    rateSource?: string;
    rateTimestamp?: string;
    baseRate?: number;
  }) => {
    setRoutes(foundRoutes);
    setRateMetadata(metadata || null);
    setSelectedRoute(null); // Reset selection
    
    // Smooth scroll to results on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const resultsSection = document.getElementById('route-results');
        resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleWormholeRouteSelected = (route: WormholeRoute) => {
    setWormholeRoutes(prev => [...prev, route]);
    // Convert Wormhole route to RouteQuote format for compatibility
    const convertedRoute: RouteQuote = {
      routeId: route.routeId,
      sendAsset: {
        code: route.sourceAsset.symbol,
        issuer: route.sourceAsset.address !== '0x0000000000000000000000000000000000000000' ? route.sourceAsset.address : undefined,
        type: route.sourceAsset.type === 'native' ? 'native' : 'credit_alphanum4'
      },
      destAsset: {
        code: route.destAsset.symbol,
        issuer: route.destAsset.address !== '0x0000000000000000000000000000000000000000' ? route.destAsset.address : undefined,
        type: route.destAsset.type === 'native' ? 'native' : 'credit_alphanum4'
      },
      grossSend: route.sendAmount,
      legs: route.steps.map(step => ({
        type: 'offchain-quote' as const,
        from: step.asset.symbol,
        to: step.asset.symbol,
        rate: 1,
        estSeconds: step.estimatedTime,
        fees: [{
          kind: 'bridge_fee',
          amount: route.fees.totalFees,
          asset: route.destAsset.symbol
        }],
        provider: 'Wormhole Bridge'
      })),
      totalFees: route.fees.totalFees,
      netReceive: route.receiveAmount,
      effectiveRate: route.exchangeRate,
      riskScore: route.riskScore,
      slippagePct: 0.01,
      execution: {
        canBuildXDR: false,
        contractAttestationSupported: false,
        requiresKYC: false,
        estimatedConfirmationTime: route.estimatedTime
      },
      providerName: 'Wormhole Bridge',
      createdAt: new Date()
    };
    
    setRoutes(prev => [...prev, convertedRoute]);
    setSelectedRoute(convertedRoute);
  };

  const handleSelectRoute = async (route: RouteQuote) => {
    setSelectedRoute(route);
    setLoading(true);
    setError(null);
    setTransactionHash(null);
    setExplorerUrl(null);

    try {
      // 1. Connect to Freighter wallet
      console.log('🔌 Connecting to Freighter wallet...');
      const userPublicKey = await connectFreighter();
      setConnectedPublicKey(userPublicKey);
      console.log('✅ Connected:', userPublicKey.substring(0, 8) + '...');

      // 2. Check if this is a Stellar route (only check trustlines for Stellar assets)
      const isStellarRoute = route.providerName === 'Stellar' || 
                           (route.sendAsset.issuer && route.sendAsset.issuer.startsWith('G')) ||
                           (route.destAsset.issuer && route.destAsset.issuer.startsWith('G'));

      if (isStellarRoute) {
        // Check if user has trustline for source asset (Stellar only)
        console.log('🔍 Checking Stellar trustline for', route.sendAsset.code);
        const hasSourceTrustline = await hasTrustline(userPublicKey, route.sendAsset);
        if (!hasSourceTrustline && route.sendAsset.issuer) {
          throw new Error(
            `Please add a trustline for ${route.sendAsset.code} in your Freighter wallet first.\n` +
            `Use the Trustline Manager above to create trustlines for all supported assets.\n` +
            `Issuer: ${route.sendAsset.issuer.substring(0, 8)}...`
          );
        }

        // Check if user has sufficient balance (Stellar only)
        console.log('💰 Checking Stellar balance for', route.sendAsset.code);
        const balance = await getBalance(userPublicKey, route.sendAsset);
        const balanceNum = parseFloat(balance);
        if (balanceNum < route.grossSend) {
          throw new Error(
            `Insufficient ${route.sendAsset.code} balance.\n` +
            `Required: ${route.grossSend.toFixed(2)}\n` +
            `Available: ${balanceNum.toFixed(2)}`
          );
        }
        console.log('✅ Stellar balance sufficient:', balance, route.sendAsset.code);
      } else {
        // For non-Stellar routes (Wormhole), skip trustline checks
        console.log('🌉 Wormhole route detected - skipping Stellar trustline checks');
      }

      if (isStellarRoute) {
        // 4. Build Stellar transaction XDR
        console.log('🏗️ Building Stellar transaction...');
        const xdr = await buildPathPaymentTransaction(userPublicKey, route);
        console.log('✅ Stellar transaction built');

        // 5. Request signature from Freighter
        console.log('✍️ Requesting signature from Freighter...');
        const signedXDR = await signWithFreighter(xdr);
        console.log('✅ Transaction signed');

        // 6. Submit to Horizon testnet
        console.log('📡 Submitting transaction to Stellar testnet...');
        const result = await submitTransaction(signedXDR);
        console.log('✅ Transaction submitted successfully!');
        console.log('  Hash:', result.hash);
        console.log('  Ledger:', result.ledger);
        console.log('  Explorer:', result.explorerUrl);

        // 7. Update state with success
        setTransactionHash(result.hash);
        setExplorerUrl(result.explorerUrl);
      } else {
        // For Wormhole routes, initiate actual bridge process
        console.log('🌉 Processing Wormhole bridge transaction...');
        
        try {
          // Determine proper destination asset for Wormhole bridge
          let destAsset = route.destAsset.code;
          
          // Determine chains based on provider and asset information
          let sourceChain = 'ethereum'; // Default
          let destChain = 'avalanche';  // Default
          
          // For Wormhole routes, try to determine chains from the route data
          if (route.providerName === 'Wormhole Bridge') {
            // Try to determine source chain from send asset
            if (route.sendAsset.code === 'ETH') {
              sourceChain = 'ethereum';
            } else if (route.sendAsset.code === 'SOL') {
              sourceChain = 'solana';
            } else if (route.sendAsset.code === 'AVAX') {
              sourceChain = 'avalanche';
            } else if (route.sendAsset.code === 'MATIC') {
              sourceChain = 'polygon';
            }
            
            // Try to determine dest chain from dest asset
            if (route.destAsset.code === 'SOL') {
              destChain = 'solana';
            } else if (route.destAsset.code === 'AVAX') {
              destChain = 'avalanche';
            } else if (route.destAsset.code === 'MATIC') {
              destChain = 'polygon';
            } else if (route.destAsset.code === 'XLM') {
              destChain = 'stellar';
            }
          }
          
          // Asset mapping for cross-chain bridges
          const assetMapping: Record<string, Record<string, string>> = {
            'ethereum': {
              'avalanche': 'WETH',  // ETH → WETH (wrapped ETH on Avalanche)
              'solana': 'SOL',      // ETH → SOL
              'polygon': 'WETH',    // ETH → WETH (wrapped ETH on Polygon)
              'bsc': 'WETH',        // ETH → WETH (wrapped ETH on BSC)
              'arbitrum': 'ETH',    // ETH → ETH (native on Arbitrum)
              'optimism': 'ETH',    // ETH → ETH (native on Optimism)
              'base': 'ETH',        // ETH → ETH (native on Base)
              'stellar': 'XLM'      // ETH → XLM
            },
            'solana': {
              'ethereum': 'ETH',    // SOL → ETH
              'avalanche': 'AVAX',  // SOL → AVAX
              'polygon': 'MATIC',   // SOL → MATIC
              'stellar': 'XLM'      // SOL → XLM
            },
            'avalanche': {
              'ethereum': 'ETH',    // AVAX → ETH
              'solana': 'SOL',      // AVAX → SOL
              'polygon': 'MATIC'    // AVAX → MATIC
            }
          };
          
          // Use mapping if available, otherwise use original dest asset
          if (assetMapping[sourceChain] && assetMapping[sourceChain][destChain]) {
            destAsset = assetMapping[sourceChain][destChain];
          }
          
          console.log(`🌉 Bridging ${route.sendAsset.code} from ${sourceChain} to ${destAsset} on ${destChain}`);
          
          // Call Wormhole API to initiate transfer
          const response = await fetch('/api/wormhole', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'transfer',
              sourceChain: sourceChain,
              destChain: destChain,
              sourceAsset: route.sendAsset.code,
              destAsset: destAsset,
              amount: route.grossSend,
              recipientAddress: userPublicKey, // Use Stellar address as recipient
              senderAddress: userPublicKey
            })
          });

          const result = await response.json();
          
          if (result.success && result.result.success) {
            console.log('✅ Wormhole bridge initiated!');
            console.log('  Transaction Hash:', result.result.transactionHash);
            console.log('  Wormhole Explorer:', result.result.explorerUrls.wormhole);
            
            // Update state with success
            setTransactionHash(result.result.transactionHash);
            
            // Use source explorer URL if wormhole URL is not available
            const explorerUrl = result.result.explorerUrls.wormhole || 
                              result.result.explorerUrls.source || 
                              `https://etherscan.io/tx/${result.result.transactionHash}`;
            setExplorerUrl(explorerUrl);
          } else {
            throw new Error(result.error || 'Failed to initiate Wormhole bridge');
          }
        } catch (bridgeError) {
          console.error('❌ Wormhole bridge error:', bridgeError);
          throw new Error(`Wormhole bridge failed: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
        }
      }

    } catch (error: unknown) {
      console.error('❌ Transaction error:', error);
      const friendlyError = parseFreighterError(error);
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-gray-200 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-1 md:mb-2">FX Route Shopping</h1>
        <p className="text-sm md:text-base text-gray-600">
          Compare cross-border payment routes and find the best rates across multiple providers
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stellar')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'stellar'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Stellar Routes
          </button>
          <button
            onClick={() => setActiveTab('wormhole')}
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'wormhole'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cross-Chain Bridge
          </button>
        </div>
      </div>

      {/* Testnet Anchor - Get Demo Tokens */}
      <TestnetAnchor />

      {/* Trustline Manager */}
      <TrustlineManager 
        userPublicKey={publicKey}
        onTrustlineCreated={(asset) => {
          console.log(`Trustline created for ${asset}`);
          // Optionally refresh routes or show success message
        }}
      />

      {/* Tab Content */}
      {activeTab === 'stellar' ? (
        /* Stellar Routes Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column: Payment Form */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <PaymentForm 
                onRoutesFound={handleRoutesFound}
                publicKey={publicKey}
              />
            </div>
          </div>

          {/* Right Column: Route Comparison */}
          <div id="route-results" className="lg:col-span-2">
            <RouteComparison
              routes={routes}
              onSelectRoute={handleSelectRoute}
              rateMetadata={rateMetadata || undefined}
            />
          </div>
        </div>
      ) : (
        /* Wormhole Bridge Tab */
        <div className="space-y-6">
          {/* Example Section */}
          <WormholeExample />
          
          {/* Bridge Form and Routes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Left Column: Bridge Form */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-4">
                <WormholeBridge 
                  onRouteSelected={handleWormholeRouteSelected}
                />
              </div>
            </div>

            {/* Right Column: Bridge Routes */}
            <div className="lg:col-span-1">
              {wormholeRoutes.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-black">Bridge Routes</h3>
                  {wormholeRoutes.map((route, index) => (
                    <div key={index} className="bg-white border border-gray-200 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-black">{route.sourceAsset.symbol} → {route.destAsset.symbol}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1">Wormhole</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-slate-600">Send</div>
                          <div className="font-medium">{route.sendAmount} {route.sourceAsset.symbol}</div>
                        </div>
                        <div>
                          <div className="text-slate-600">Receive</div>
                          <div className="font-medium text-green-600">{route.receiveAmount.toFixed(6)} {route.destAsset.symbol}</div>
                        </div>
                        <div>
                          <div className="text-slate-600">Fees</div>
                          <div className="font-medium">{route.fees.totalFees.toFixed(6)} {route.destAsset.symbol}</div>
                        </div>
                        <div>
                          <div className="text-slate-600">Est. Time</div>
                          <div className="font-medium">{Math.round(route.estimatedTime / 60)} min</div>
                        </div>
                      </div>
                      {route.isWrapped && (
                        <div className="mt-2 text-xs text-orange-600">
                          ⚠️ Destination asset will be wrapped
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 p-6 text-center">
                  <div className="text-gray-500 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bridge Routes Yet</h3>
                  <p className="text-gray-600 text-sm">
                    Use the bridge form to get quotes for cross-chain transfers
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Route Summary (if any) - Mobile Optimized */}
      {selectedRoute && (
        <div className={`border-2 p-4 md:p-6 ${
          transactionHash
            ? 'bg-green-50 border-green-500'
            : error
            ? 'bg-red-50 border-red-500'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <h3 className="text-base md:text-lg font-bold text-black mb-3 md:mb-4">
            {transactionHash ? '✅ Transaction Successful!' : error ? '❌ Transaction Failed' : '✓ Route Selected:'} {selectedRoute.providerName}
          </h3>

          {/* Route Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm mb-4">
            <div>
              <div className="text-xs text-slate-600 mb-1">Send Amount</div>
              <div className="font-bold text-black text-sm md:text-base">
                {selectedRoute.grossSend.toLocaleString()} {selectedRoute.sourceFiat || selectedRoute.sendAsset.code}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Receive Amount</div>
              <div className="font-bold text-green-600 text-sm md:text-base">
                {(selectedRoute.grossSend * selectedRoute.effectiveRate).toLocaleString()} {selectedRoute.destinationFiat || selectedRoute.destAsset.code}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Total Fees</div>
              <div className="font-bold text-black text-sm md:text-base">
                {selectedRoute.totalFees.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Est. Time</div>
              <div className="font-bold text-black text-sm md:text-base">
                ~{selectedRoute.execution.estimatedConfirmationTime}s
              </div>
            </div>
          </div>

          {/* Wallet Connection Info */}
          {connectedPublicKey && !transactionHash && !error && (
            <div className="mb-4 p-3 bg-white border border-gray-200 text-xs">
              <span className="text-slate-600">Connected Wallet: </span>
              <span className="font-mono font-bold text-black">
                {connectedPublicKey.substring(0, 8)}...{connectedPublicKey.substring(connectedPublicKey.length - 8)}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 text-sm">
              <div className="font-bold text-red-800 mb-2">Error:</div>
              <div className="text-red-700 whitespace-pre-line">{error}</div>
              {error.includes('trustline') && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Use the Trustline Manager above to create trustlines for all supported Stellar assets.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Display */}
          {transactionHash && explorerUrl && (
            <div className="mb-4 p-4 bg-green-100 border border-green-300 text-sm">
              <div className="font-bold text-green-800 mb-2">✅ Transaction Successful! Wormhole Bridge</div>
              <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                <div>
                  <div className="font-semibold text-green-700">Send Amount</div>
                  <div className="text-green-600">{selectedRoute?.grossSend} {selectedRoute?.sendAsset.code}</div>
                </div>
                <div>
                  <div className="font-semibold text-green-700">Receive Amount</div>
                  <div className="text-green-600">{selectedRoute?.netReceive} {selectedRoute?.destAsset.code}</div>
                </div>
                <div>
                  <div className="font-semibold text-green-700">Total Fees</div>
                  <div className="text-green-600">{selectedRoute?.totalFees}</div>
                </div>
                <div>
                  <div className="font-semibold text-green-700">Est. Time</div>
                  <div className="text-green-600">~{selectedRoute?.execution.estimatedConfirmationTime}s</div>
                </div>
              </div>
              <div className="font-bold text-green-800 mb-2">Transaction Hash:</div>
              <div className="font-mono text-xs text-green-700 mb-3 break-all">
                {transactionHash}
              </div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                {explorerUrl.includes('wormholescan.io') ? 'View on Wormhole Explorer →' : 
                 explorerUrl.includes('etherscan.io') ? 'View on Etherscan →' :
                 explorerUrl.includes('snowtrace.io') ? 'View on Snowtrace →' :
                 'View Transaction →'}
              </a>
              
              {/* Additional explorer links for Wormhole transactions */}
              {transactionHash && transactionHash.startsWith('0x') && (
                <div className="mt-2">
                  <div className="text-xs text-green-700 mb-2">
                    💡 <strong>Tip:</strong> For cross-chain transactions, you can also view on:
                  </div>
                  <div className="space-x-2">
                    <a
                      href={`https://etherscan.io/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Etherscan
                    </a>
                    <a
                      href={`https://wormholescan.io/search?q=${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-purple-600 text-white px-3 py-1 text-xs font-medium hover:bg-purple-700 transition-colors"
                    >
                      Wormhole Search
                    </a>
                  </div>
                </div>
              )}
              
              {/* Start New Transaction Button */}
              <div className="mt-4 pt-3 border-t border-green-200">
                <button
                  onClick={() => {
                    setTransactionHash(null);
                    setExplorerUrl(null);
                    setSelectedRoute(null);
                    setError(null);
                  }}
                  className="w-full bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Start New Transaction
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mb-4 p-4 bg-blue-100 border border-blue-300 text-sm">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <div className="text-blue-800">
                  Processing transaction... Please approve in Freighter wallet.
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!transactionHash && !loading && (
            <div className="pt-4 border-t border-gray-200">
              <button
                className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                onClick={() => handleSelectRoute(selectedRoute)}
                disabled={loading}
              >
                {error ? 'Retry Transaction' : 'Sign Transaction with Freighter'}
              </button>
            </div>
          )}

          {/* New Transaction Button */}
          {transactionHash && (
            <div className="pt-4 border-t border-green-200">
              <button
                className="w-full md:w-auto bg-green-600 text-white px-6 py-3 text-sm font-medium hover:bg-green-700 transition-colors"
                onClick={() => {
                  setSelectedRoute(null);
                  setTransactionHash(null);
                  setExplorerUrl(null);
                  setError(null);
                  setConnectedPublicKey(null);
                }}
              >
                Start New Transaction
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
