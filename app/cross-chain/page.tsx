/**
 * Cross-Chain Bridge Page
 * Provides Wormhole-powered cross-chain asset bridging capabilities
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import WormholeBridge from '@/app/components/WormholeBridge';
import WormholeExample from '@/app/components/WormholeExample';
import TrustlineManager from '@/app/components/TrustlineManager';
import { connectFreighter } from '@/lib/freighter-integration';
import { WormholeRoute } from '@/lib/wormhole/types';

export default function CrossChainPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bridge' | 'examples' | 'trustlines'>('bridge');

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const key = await connectFreighter();
      setPublicKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleRouteSelected = (route: WormholeRoute) => {
    console.log('Route selected:', route);
    // Additional handling can be added here
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-black">
              LumenFX
            </Link>
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              <Link href="/dashboard" className="text-sm text-gray-700 hover:text-black transition-colors">Dashboard</Link>
              <Link href="/routes" className="text-sm text-gray-700 hover:text-black transition-colors">Routes</Link>
              <Link href="/cross-chain" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">Cross-Chain</Link>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {!publicKey ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-black text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-900 font-mono">
                  {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="bg-white border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-1 md:mb-2">Cross-Chain Bridge</h1>
            <p className="text-sm md:text-base text-gray-600">
              Bridge assets across multiple blockchains using Wormhole protocol
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 md:p-4 mb-4">
              <p className="text-xs md:text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white border border-gray-200 mb-4 md:mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('bridge')}
                className={`flex-1 md:flex-none md:px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'bridge'
                    ? 'text-black border-b-2 border-black bg-gray-50'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Bridge
              </button>
              <button
                onClick={() => setActiveTab('examples')}
                className={`flex-1 md:flex-none md:px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'examples'
                    ? 'text-black border-b-2 border-black bg-gray-50'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Examples & Info
              </button>
              <button
                onClick={() => setActiveTab('trustlines')}
                className={`flex-1 md:flex-none md:px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'trustlines'
                    ? 'text-black border-b-2 border-black bg-gray-50'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                Trustline Manager
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-4 md:space-y-6">
            {activeTab === 'bridge' && (
              <div className="bg-white border border-gray-200 p-4 md:p-6">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-black mb-1 md:mb-2">Bridge Assets</h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Select source and destination chains to bridge your assets
                  </p>
                </div>
                <WormholeBridge
                  onRouteSelected={handleRouteSelected}
                  className="w-full"
                />
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="bg-white border border-gray-200 p-4 md:p-6">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-black mb-1 md:mb-2">Popular Routes & Examples</h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Learn about common bridge routes and how to use them
                  </p>
                </div>
                <WormholeExample />
              </div>
            )}

            {activeTab === 'trustlines' && (
              <div className="bg-white border border-gray-200 p-4 md:p-6">
                <div className="mb-4 md:mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-black mb-1 md:mb-2">Manage Trustlines</h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Create trustlines for Stellar assets to enable cross-chain bridging
                  </p>
                </div>
                {publicKey ? (
                  <TrustlineManager userPublicKey={publicKey} />
                ) : (
                  <div className="text-center py-8 md:py-12 bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-4">Connect your wallet to manage trustlines</p>
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                    >
                      {connecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Multi-Chain</h3>
                <div className="w-8 h-8 bg-blue-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-700">
                Bridge assets across Ethereum, Solana, Polygon, BSC, Avalanche, Arbitrum, Optimism, Base, and Stellar
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-6 border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Secure</h3>
                <div className="w-8 h-8 bg-green-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-700">
                Powered by Wormhole&apos;s battle-tested infrastructure with billions in TVL
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 md:p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Low Fees</h3>
                <div className="w-8 h-8 bg-purple-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <p className="text-xs md:text-sm text-gray-700">
                Competitive bridge fees with transparent pricing and no hidden costs
              </p>
            </div>
          </div>

          {/* Back Navigation */}
          <div className="mt-6 md:mt-8 text-center md:text-left">
            <Link
              href="/dashboard"
              className="inline-block border border-gray-300 text-black px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
