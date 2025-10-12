/**
 * Wormhole Example Component
 * Demonstrates ETH to Solana bridging with real-world example
 */

'use client';

import { useState } from 'react';
import { WormholeService } from '@/lib/wormhole/service';
import { WORMHOLE_CONFIG, getAssetBySymbol } from '@/lib/wormhole/config';
import { WormholeRoute, WormholeTransferRequest, WormholeQuote, WormholeTransferResult } from '@/lib/wormhole/types';

interface ExampleResult {
  quote?: WormholeQuote;
  transfer?: WormholeTransferResult;
  step: 'input' | 'quote' | 'transfer' | 'complete';
}

export default function WormholeExample() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExampleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'quote' | 'transfer' | 'complete'>('input');

  const wormholeService = new WormholeService(WORMHOLE_CONFIG);

  // Example: Bridge 0.1 ETH from Ethereum to Solana
  const handleExampleBridge = async () => {
    setLoading(true);
    setError(null);
    setStep('quote');

    try {
      // Step 1: Get quote for ETH to SOL bridge
      console.log('🔄 Getting quote for ETH to SOL bridge...');
      
      const ethAsset = getAssetBySymbol('ETH', 'ethereum');
      if (!ethAsset) {
        throw new Error('ETH asset not found');
      }

      const quote = await wormholeService.getQuote(
        'ethereum',
        'solana',
        ethAsset,
        0.1 // 0.1 ETH
      );

      console.log('✅ Quote received:', quote);
      setResult({ quote, step: 'quote' });
      setStep('transfer');

      // Step 2: Simulate transfer initiation
      console.log('🔄 Initiating transfer...');
      
      const transferRequest: WormholeTransferRequest = {
        sourceChain: 'ethereum',
        destChain: 'solana',
        sourceAsset: ethAsset,
        destAsset: quote.destAsset,
        amount: 0.1,
        recipientAddress: 'DEMO_SOLANA_ADDRESS', // Would be real address
        senderAddress: 'DEMO_ETHEREUM_ADDRESS' // Would be real address
      };

      const transferResult = await wormholeService.initiateTransfer(transferRequest);
      
      console.log('✅ Transfer initiated:', transferResult);
      setResult(prev => ({ ...prev, transfer: transferResult, step: 'transfer' }));
      setStep('complete');

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  // Example: Bridge USDC from Ethereum to Stellar
  const handleStellarBridge = async () => {
    setLoading(true);
    setError(null);
    setStep('quote');

    try {
      // Step 1: Get quote for USDC to Stellar bridge
      console.log('🔄 Getting quote for USDC to Stellar bridge...');
      
      const usdcAsset = getAssetBySymbol('USDC', 'ethereum');
      if (!usdcAsset) {
        throw new Error('USDC asset not found');
      }

      const quote = await wormholeService.getQuote(
        'ethereum',
        'stellar',
        usdcAsset,
        100 // 100 USDC
      );

      console.log('✅ Quote received:', quote);
      setResult({ quote, step: 'quote' });
      setStep('transfer');

      // Step 2: Simulate transfer initiation
      console.log('🔄 Initiating transfer to Stellar...');
      
      const transferRequest: WormholeTransferRequest = {
        sourceChain: 'ethereum',
        destChain: 'stellar',
        sourceAsset: usdcAsset,
        destAsset: quote.destAsset,
        amount: 100,
        recipientAddress: 'DEMO_STELLAR_ADDRESS', // Would be real Stellar address
        senderAddress: 'DEMO_ETHEREUM_ADDRESS' // Would be real address
      };

      const transferResult = await wormholeService.initiateTransfer(transferRequest);
      
      console.log('✅ Transfer initiated:', transferResult);
      setResult(prev => ({ ...prev, transfer: transferResult, step: 'transfer' }));
      setStep('complete');

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const resetExample = () => {
    setResult(null);
    setError(null);
    setStep('input');
    setLoading(false);
  };

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black mb-2">Wormhole Bridge Examples</h3>
        <p className="text-sm text-gray-600 mb-4">
          Try these examples to see cross-chain bridging in action. Bridge ETH to Solana or USDC to Stellar using Wormhole.
        </p>
        
        {/* Example Flow Steps */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={`flex items-center space-x-2 ${step === 'input' ? 'text-blue-600' : step === 'quote' || step === 'transfer' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === 'input' ? 'bg-blue-600 text-white' : 
              step === 'quote' || step === 'transfer' || step === 'complete' ? 'bg-green-600 text-white' : 
              'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className="text-sm">Input</span>
          </div>
          
          <div className={`flex-1 h-0.5 ${step === 'quote' || step === 'transfer' || step === 'complete' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          
          <div className={`flex items-center space-x-2 ${step === 'quote' ? 'text-blue-600' : step === 'transfer' || step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === 'quote' ? 'bg-blue-600 text-white' : 
              step === 'transfer' || step === 'complete' ? 'bg-green-600 text-white' : 
              'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="text-sm">Quote</span>
          </div>
          
          <div className={`flex-1 h-0.5 ${step === 'transfer' || step === 'complete' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          
          <div className={`flex items-center space-x-2 ${step === 'transfer' ? 'text-blue-600' : step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === 'transfer' ? 'bg-blue-600 text-white' : 
              step === 'complete' ? 'bg-green-600 text-white' : 
              'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className="text-sm">Transfer</span>
          </div>
          
          <div className={`flex-1 h-0.5 ${step === 'complete' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          
          <div className={`flex items-center space-x-2 ${step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              4
            </div>
            <span className="text-sm">Complete</span>
          </div>
        </div>
      </div>

      {/* Example Details */}
      <div className="bg-gray-50 p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-2">Example Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Source Chain</div>
            <div className="font-medium">Ethereum</div>
          </div>
          <div>
            <div className="text-gray-600">Destination Chain</div>
            <div className="font-medium">Solana</div>
          </div>
          <div>
            <div className="text-gray-600">Source Asset</div>
            <div className="font-medium">ETH</div>
          </div>
          <div>
            <div className="text-gray-600">Amount</div>
            <div className="font-medium">0.1 ETH</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {step === 'input' && (
        <div className="space-y-3">
          <button
            onClick={handleExampleBridge}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Running Example...' : 'Run ETH → SOL Bridge Example'}
          </button>
          
          <button
            onClick={handleStellarBridge}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 px-4 font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Running Example...' : 'Run USDC → Stellar Bridge Example'}
          </button>
        </div>
      )}

      {/* Quote Results */}
      {result?.quote && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">Bridge Quote</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-700">Send</div>
              <div className="font-medium">{result.quote.sendAmount} {result.quote.sourceAsset.symbol}</div>
            </div>
            <div>
              <div className="text-blue-700">Receive</div>
              <div className="font-medium text-green-600">{result.quote.receiveAmount.toFixed(6)} {result.quote.destAsset.symbol}</div>
            </div>
            <div>
              <div className="text-blue-700">Exchange Rate</div>
              <div className="font-medium">1 ETH = {result.quote.exchangeRate.toFixed(6)} SOL</div>
            </div>
            <div>
              <div className="text-blue-700">Total Fees</div>
              <div className="font-medium">{result.quote.fees.totalFees.toFixed(6)} {result.quote.destAsset.symbol}</div>
            </div>
            <div>
              <div className="text-blue-700">Est. Time</div>
              <div className="font-medium">{Math.round(result.quote.estimatedTime / 60)} minutes</div>
            </div>
            <div>
              <div className="text-blue-700">Wrapped Asset</div>
              <div className="font-medium">{result.quote.isWrapped ? 'Yes' : 'No'}</div>
            </div>
          </div>
          
          {result.quote.isWrapped && (
            <div className="mt-3 p-2 bg-orange-100 border border-orange-200 text-orange-800 text-xs">
              ⚠️ The destination asset will be wrapped (WETH on Solana)
            </div>
          )}
        </div>
      )}

      {/* Transfer Results */}
      {result?.transfer && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200">
          <h4 className="font-medium text-green-900 mb-3">Transfer Initiated</h4>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-green-700">Transaction Hash</div>
              <div className="font-mono text-xs break-all">{result.transfer.transactionHash}</div>
            </div>
            {result.transfer.wormholeSequence && (
              <div>
                <div className="text-green-700">Wormhole Sequence</div>
                <div className="font-mono text-xs">{result.transfer.wormholeSequence}</div>
              </div>
            )}
            {result.transfer.vaaHash && (
              <div>
                <div className="text-green-700">VAA Hash</div>
                <div className="font-mono text-xs break-all">{result.transfer.vaaHash}</div>
              </div>
            )}
            {result.transfer.estimatedCompletionTime && (
              <div>
                <div className="text-green-700">Est. Completion</div>
                <div className="font-medium">{new Date(result.transfer.estimatedCompletionTime).toLocaleString()}</div>
              </div>
            )}
          </div>
          
          {result.transfer.explorerUrls.source && (
            <div className="mt-3">
              <a
                href={result.transfer.explorerUrls.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white px-3 py-1 text-xs font-medium hover:bg-green-700 transition-colors"
              >
                View on Etherscan →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200">
          <h4 className="font-medium text-red-900 mb-2">Error</h4>
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Reset Button */}
      {(result || error) && (
        <div className="mt-6">
          <button
            onClick={resetExample}
            className="w-full bg-gray-600 text-white py-2 px-4 font-medium hover:bg-gray-700 transition-colors"
          >
            Reset Example
          </button>
        </div>
      )}

      {/* Technical Details */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Uses Wormhole&apos;s Core Bridge for cross-chain messaging</div>
          <div>• ETH is locked on Ethereum, SOL is minted on Solana</div>
          <div>• VAA (Verifiable Action Approval) ensures security</div>
          <div>• Estimated completion time: 5-15 minutes</div>
          <div>• Fees include Wormhole protocol fee + gas costs</div>
        </div>
      </div>
    </div>
  );
}
