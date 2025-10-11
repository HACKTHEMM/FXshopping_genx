/**
 * Wormhole Bridge Component
 * Provides UI for cross-chain asset bridging
 */

'use client';

import { useState } from 'react';
import { WormholeChainId, WormholeRoute, WormholeQuote } from '@/lib/wormhole/types';
import { POPULAR_ROUTES, getAssetsByChain } from '@/lib/wormhole/config';

interface WormholeBridgeProps {
  onRouteSelected?: (route: WormholeRoute) => void;
  className?: string;
}

export default function WormholeBridge({ onRouteSelected, className = '' }: WormholeBridgeProps) {
  const [sourceChain, setSourceChain] = useState<WormholeChainId>('ethereum');
  const [destChain, setDestChain] = useState<WormholeChainId>('solana');
  const [sourceAsset, setSourceAsset] = useState<string>('ETH');
  const [destAsset, setDestAsset] = useState<string>('SOL');
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<WormholeQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<WormholeQuote | null>(null);

  // Get available assets for selected chains
  const sourceAssets = getAssetsByChain(sourceChain);
  const destAssets = getAssetsByChain(destChain);

  // Handle chain selection
  const handleSourceChainChange = (chain: WormholeChainId) => {
    setSourceChain(chain);
    // Reset asset selection if not available on new chain
    const newAssets = getAssetsByChain(chain);
    if (!newAssets.find(a => a.symbol === sourceAsset)) {
      setSourceAsset(newAssets[0]?.symbol || '');
    }
  };

  const handleDestChainChange = (chain: WormholeChainId) => {
    setDestChain(chain);
    // Reset asset selection if not available on new chain
    const newAssets = getAssetsByChain(chain);
    if (!newAssets.find(a => a.symbol === destAsset)) {
      setDestAsset(newAssets[0]?.symbol || '');
    }
  };

  // Get quotes
  const handleGetQuotes = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    setQuotes([]);

    try {
      const response = await fetch('/api/wormhole/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceChain,
          destChain,
          sourceAsset,
          amount: parseFloat(amount)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQuotes([data.quote]);
        setSelectedQuote(data.quote);
      } else {
        setError(data.error || 'Failed to get quote');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error getting quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initiate transfer
  const handleTransfer = async () => {
    if (!selectedQuote || !recipientAddress) {
      setError('Please select a quote and enter recipient address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wormhole/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceChain,
          destChain,
          sourceAsset,
          destAsset,
          amount: parseFloat(amount),
          recipientAddress,
          senderAddress: undefined // Would be filled by wallet connection
        }),
      });

      const data = await response.json();

      if (data.success && data.result.success) {
        // Transfer initiated successfully
        alert(`Transfer initiated! Transaction: ${data.result.transactionHash}`);
        if (onRouteSelected && selectedQuote) {
          // Convert quote to route format for compatibility
          const route: WormholeRoute = {
            routeId: selectedQuote.routeId,
            sourceAsset: selectedQuote.sourceAsset,
            destAsset: selectedQuote.destAsset,
            sourceChain: selectedQuote.sourceAsset.chainId,
            destChain: selectedQuote.destAsset.chainId,
            sendAmount: selectedQuote.sendAmount,
            receiveAmount: selectedQuote.receiveAmount,
            exchangeRate: selectedQuote.exchangeRate,
            fees: selectedQuote.fees,
            estimatedTime: selectedQuote.estimatedTime,
            steps: [], // Would be populated by service
            riskScore: 0.1,
            isWrapped: selectedQuote.isWrapped,
            contractAddresses: {}
          };
          onRouteSelected(route);
        }
      } else {
        setError(data.result?.error || data.error || 'Transfer failed');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error initiating transfer:', err);
    } finally {
      setLoading(false);
    }
  };

  // Swap chains
  const handleSwapChains = () => {
    const tempChain = sourceChain;
    const tempAsset = sourceAsset;
    setSourceChain(destChain);
    setDestChain(tempChain);
    setSourceAsset(destAsset);
    setDestAsset(tempAsset);
  };

  return (
    <div className={`bg-white border border-gray-200 p-4 md:p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black mb-2">Cross-Chain Bridge</h3>
        <p className="text-sm text-blue-600">
          Bridge assets between different blockchains using Wormhole
        </p>
      </div>

      {/* Popular Routes */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-purple-700 mb-2">Popular Routes</h4>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROUTES.map((route, index) => (
            <button
              key={index}
              onClick={() => {
                setSourceChain(route.sourceChain);
                setDestChain(route.destChain);
                setSourceAsset(route.sourceAsset);
                setDestAsset(route.destAsset);
              }}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              {route.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bridge Form */}
      <div className="space-y-4">
        {/* Source Chain & Asset */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-indigo-700 mb-1">From Chain</label>
            <select
              value={sourceChain}
              onChange={(e) => handleSourceChainChange(e.target.value as WormholeChainId)}
              className="w-full p-2 border border-gray-300 text-sm"
            >
              <option value="ethereum">Ethereum</option>
              <option value="solana">Solana</option>
              <option value="polygon">Polygon</option>
              <option value="avalanche">Avalanche</option>
              <option value="bsc">BSC</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-700 mb-1">Asset</label>
            <select
              value={sourceAsset}
              onChange={(e) => setSourceAsset(e.target.value)}
              className="w-full p-2 border border-gray-300 text-sm"
            >
              {sourceAssets.map((asset) => (
                <option key={asset.address} value={asset.symbol}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapChains}
            className="p-2 bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Swap chains"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Destination Chain & Asset */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-indigo-700 mb-1">To Chain</label>
            <select
              value={destChain}
              onChange={(e) => handleDestChainChange(e.target.value as WormholeChainId)}
              className="w-full p-2 border border-gray-300 text-sm"
            >
              <option value="ethereum">Ethereum</option>
              <option value="solana">Solana</option>
              <option value="polygon">Polygon</option>
              <option value="avalanche">Avalanche</option>
              <option value="bsc">BSC</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-700 mb-1">Asset</label>
            <select
              value={destAsset}
              onChange={(e) => setDestAsset(e.target.value)}
              className="w-full p-2 border border-gray-300 text-sm"
            >
              {destAssets.map((asset) => (
                <option key={asset.address} value={asset.symbol}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-indigo-700 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-2 border border-gray-300 text-sm"
            min="0"
            step="0.000001"
          />
        </div>

        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium text-indigo-700 mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter recipient address"
            className="w-full p-2 border border-gray-300 text-sm"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Quote Display */}
        {quotes.length > 0 && selectedQuote && (
          <div className="p-4 bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Bridge Quote</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-600">Send</div>
                <div className="font-medium">{selectedQuote.sendAmount} {selectedQuote.sourceAsset.symbol}</div>
              </div>
              <div>
                <div className="text-slate-600">Receive</div>
                <div className="font-medium text-green-600">{selectedQuote.receiveAmount.toFixed(6)} {selectedQuote.destAsset.symbol}</div>
              </div>
              <div>
                <div className="text-slate-600">Fees</div>
                <div className="font-medium">{selectedQuote.fees.totalFees.toFixed(6)} {selectedQuote.destAsset.symbol}</div>
              </div>
              <div>
                <div className="text-slate-600">Est. Time</div>
                <div className="font-medium">{Math.round(selectedQuote.estimatedTime / 60)} min</div>
              </div>
            </div>
            {selectedQuote.isWrapped && (
              <div className="mt-2 text-xs text-orange-600">
                ⚠️ Destination asset will be wrapped
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGetQuotes}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="flex-1 bg-blue-600 text-white py-2 px-4 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Getting Quote...' : 'Get Quote'}
          </button>
          
          {selectedQuote && (
            <button
              onClick={handleTransfer}
              disabled={loading || !recipientAddress}
              className="flex-1 bg-green-600 text-white py-2 px-4 text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Bridging...' : 'Bridge Assets'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
