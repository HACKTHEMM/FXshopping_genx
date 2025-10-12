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
  const [destChain, setDestChain] = useState<WormholeChainId>('stellar');
  const [sourceAsset, setSourceAsset] = useState<string>('ETH');
  const [destAsset, setDestAsset] = useState<string>('XLM');
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<WormholeQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<WormholeQuote | null>(null);

  // Get available assets for selected chains
  const sourceAssets = getAssetsByChain(sourceChain);
  const destAssets = getAssetsByChain(destChain);

  // All supported chains (including Stellar)
  const allChains: WormholeChainId[] = ['ethereum', 'solana', 'polygon', 'avalanche', 'bsc', 'arbitrum', 'optimism', 'base', 'stellar'];

  // Non-Stellar chains for cross-chain bridging
  const nonStellarChains = allChains.filter(chain => chain !== 'stellar');

  // Handle chain selection - one side must always be Stellar
  const handleSourceChainChange = (chain: WormholeChainId) => {
    setSourceChain(chain);

    // If user selects Stellar as source, destination must be non-Stellar
    if (chain === 'stellar') {
      if (destChain === 'stellar') {
        setDestChain('ethereum'); // Default to Ethereum
        const newDestAssets = getAssetsByChain('ethereum');
        setDestAsset(newDestAssets[0]?.symbol || '');
      }
    } else {
      // If user selects non-Stellar as source, destination must be Stellar
      setDestChain('stellar');
      const newDestAssets = getAssetsByChain('stellar');
      setDestAsset(newDestAssets[0]?.symbol || '');
    }

    // Reset asset selection if not available on new chain
    const newAssets = getAssetsByChain(chain);
    if (!newAssets.find(a => a.symbol === sourceAsset)) {
      setSourceAsset(newAssets[0]?.symbol || '');
    }
  };

  const handleDestChainChange = (chain: WormholeChainId) => {
    setDestChain(chain);

    // If user selects Stellar as destination, source must be non-Stellar
    if (chain === 'stellar') {
      if (sourceChain === 'stellar') {
        setSourceChain('ethereum'); // Default to Ethereum
        const newSourceAssets = getAssetsByChain('ethereum');
        setSourceAsset(newSourceAssets[0]?.symbol || '');
      }
    } else {
      // If user selects non-Stellar as destination, source must be Stellar
      setSourceChain('stellar');
      const newSourceAssets = getAssetsByChain('stellar');
      setSourceAsset(newSourceAssets[0]?.symbol || '');
    }

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

    // Ensure one side is Stellar for cross-chain bridging
    if (sourceChain !== 'stellar' && destChain !== 'stellar') {
      setError('Cross-chain bridging requires one side to be Stellar');
      return;
    }

    if (sourceChain === destChain) {
      setError('Source and destination chains must be different');
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
    <div className={className}>
      {/* Popular Routes */}
      <div className="mb-4 md:mb-6">
        <h4 className="text-sm font-medium text-black mb-2">Popular Routes</h4>
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
              className="px-3 py-1.5 text-xs bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              {route.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bridge Form */}
      <div className="space-y-4 md:space-y-6">
        {/* Amount Input */}
        <div>
          <label htmlFor="bridge-amount" className="block text-sm font-medium text-black mb-2">
            Bridge Amount
          </label>
          <input
            id="bridge-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-base md:text-lg focus:outline-none focus:border-blue-500"
            min="0"
            step="0.000001"
            required
          />
        </div>

        {/* Source Chain & Asset */}
        <div>
          <label htmlFor="source-chain" className="block text-sm font-medium text-black mb-2">
            From Chain
          </label>
          <select
            id="source-chain"
            value={sourceChain}
            onChange={(e) => handleSourceChainChange(e.target.value as WormholeChainId)}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-sm md:text-base bg-white focus:outline-none focus:border-blue-500"
          >
            {allChains.map((chain) => (
              <option key={chain} value={chain}>
                {chain === 'ethereum' && 'Ethereum'}
                {chain === 'solana' && 'Solana'}
                {chain === 'polygon' && 'Polygon'}
                {chain === 'avalanche' && 'Avalanche'}
                {chain === 'bsc' && 'Binance Smart Chain'}
                {chain === 'arbitrum' && 'Arbitrum'}
                {chain === 'optimism' && 'Optimism'}
                {chain === 'base' && 'Base'}
                {chain === 'stellar' && 'Stellar'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="source-asset" className="block text-sm font-medium text-black mb-2">
            From Asset
          </label>
          <select
            id="source-asset"
            value={sourceAsset}
            onChange={(e) => setSourceAsset(e.target.value)}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-sm md:text-base bg-white focus:outline-none focus:border-blue-500"
          >
            {sourceAssets.map((asset) => (
              <option key={asset.address} value={asset.symbol}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2 md:-my-3">
          <button
            type="button"
            onClick={handleSwapChains}
            className="p-2 md:p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 transition-colors border border-gray-300"
            title="Swap chains"
            aria-label="Swap chains"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Destination Chain & Asset */}
        <div>
          <label htmlFor="dest-chain" className="block text-sm font-medium text-black mb-2">
            To Chain
          </label>
          <select
            id="dest-chain"
            value={destChain}
            onChange={(e) => handleDestChainChange(e.target.value as WormholeChainId)}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-sm md:text-base bg-white focus:outline-none focus:border-blue-500"
          >
            {allChains.map((chain) => (
              <option key={chain} value={chain}>
                {chain === 'ethereum' && 'Ethereum'}
                {chain === 'solana' && 'Solana'}
                {chain === 'polygon' && 'Polygon'}
                {chain === 'avalanche' && 'Avalanche'}
                {chain === 'bsc' && 'Binance Smart Chain'}
                {chain === 'arbitrum' && 'Arbitrum'}
                {chain === 'optimism' && 'Optimism'}
                {chain === 'base' && 'Base'}
                {chain === 'stellar' && 'Stellar'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dest-asset" className="block text-sm font-medium text-black mb-2">
            To Asset
          </label>
          <select
            id="dest-asset"
            value={destAsset}
            onChange={(e) => setDestAsset(e.target.value)}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-sm md:text-base bg-white focus:outline-none focus:border-blue-500"
          >
            {destAssets.map((asset) => (
              <option key={asset.address} value={asset.symbol}>
                {asset.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Address */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-black mb-2">
            Recipient Address
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter recipient address on destination chain"
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black font-mono text-xs md:text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Required for bridging assets cross-chain
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Quote Display */}
        {quotes.length > 0 && selectedQuote && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-4 md:p-6">
            <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Bridge Quote</h4>
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-600 mb-1">Send</div>
                <div className="font-bold text-black">{selectedQuote.sendAmount} {selectedQuote.sourceAsset.symbol}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Receive</div>
                <div className="font-bold text-green-600">{selectedQuote.receiveAmount.toFixed(6)} {selectedQuote.destAsset.symbol}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Total Fees</div>
                <div className="font-bold text-black">{selectedQuote.fees.totalFees.toFixed(6)} {selectedQuote.destAsset.symbol}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Est. Time</div>
                <div className="font-bold text-black">{Math.round(selectedQuote.estimatedTime / 60)} min</div>
              </div>
            </div>
            {selectedQuote.isWrapped && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
                ⚠️ Destination asset will be wrapped
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <button
          onClick={selectedQuote ? handleTransfer : handleGetQuotes}
          disabled={loading || !amount || parseFloat(amount) <= 0 || (selectedQuote !== null && !recipientAddress)}
          className="w-full bg-black text-white px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {selectedQuote ? 'Initiating Bridge...' : 'Getting Quote...'}
            </span>
          ) : selectedQuote ? (
            'Bridge Assets'
          ) : (
            'Get Bridge Quote'
          )}
        </button>

        {/* Reset Button */}
        {selectedQuote && !loading && (
          <button
            onClick={() => {
              setSelectedQuote(null);
              setQuotes([]);
              setRecipientAddress('');
            }}
            className="w-full border border-gray-300 text-gray-700 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong className="text-gray-700">Demo Notice:</strong> This is a demonstration of Wormhole cross-chain bridging.
          All bridge operations are simulated for hackathon purposes. Production implementation would require full Wormhole SDK integration
          and proper security measures.
        </p>
      </div>
    </div>
  );
}
