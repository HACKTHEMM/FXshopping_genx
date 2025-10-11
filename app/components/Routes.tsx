'use client';

import { useState } from 'react';
import { RouteQuote } from '@/lib/types/route';
import PaymentForm from './PaymentForm';
import RouteComparison from './RouteComparison';
import TestnetAnchor from './TestnetAnchor';
import { connectFreighter, signWithFreighter, parseFreighterError } from '@/lib/freighter-integration';
import { buildPathPaymentTransaction, submitTransaction, hasTrustline, getBalance } from '@/lib/stellar-transaction';
import { registerRouteWithContract, finalizeRouteWithContract, getContractExplorerUrl, isContractDeployed, ensureContractDeployed } from '@/lib/contract-client';

interface RoutesProps {
  publicKey?: string;
}

export default function Routes({ publicKey }: RoutesProps) {
  const [routes, setRoutes] = useState<RouteQuote[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteQuote | null>(null);
  const [rateMetadata, setRateMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [connectedPublicKey, setConnectedPublicKey] = useState<string | null>(null);
  const [attestationHash, setAttestationHash] = useState<string | null>(null);
  const [contractExplorerUrl, setContractExplorerUrl] = useState<string | null>(null);
  const [contractDeploymentStatus, setContractDeploymentStatus] = useState<string | null>(null);

  const handleRoutesFound = (foundRoutes: RouteQuote[], metadata?: any) => {
    setRoutes(foundRoutes);
    setRateMetadata(metadata);
    setSelectedRoute(null); // Reset selection
    
    // Smooth scroll to results on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const resultsSection = document.getElementById('route-results');
        resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
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

      // 2. Check if user has trustline for source asset
      console.log('🔍 Checking trustline for', route.sendAsset.code);
      const hasSourceTrustline = await hasTrustline(userPublicKey, route.sendAsset);
      if (!hasSourceTrustline && route.sendAsset.issuer) {
        throw new Error(
          `Please add a trustline for ${route.sendAsset.code} in your Freighter wallet first.\n` +
          `Issuer: ${route.sendAsset.issuer.substring(0, 8)}...`
        );
      }

      // 3. Check if user has sufficient balance
      console.log('💰 Checking balance for', route.sendAsset.code);
      const balance = await getBalance(userPublicKey, route.sendAsset);
      const balanceNum = parseFloat(balance);
      if (balanceNum < route.grossSend) {
        throw new Error(
          `Insufficient ${route.sendAsset.code} balance.\n` +
          `Required: ${route.grossSend.toFixed(2)}\n` +
          `Available: ${balanceNum.toFixed(2)}`
        );
      }
      console.log('✅ Balance sufficient:', balance, route.sendAsset.code);

      // 4. Auto-deploy and register route with smart contract
      let attestationHash: string | null = null;
      try {
        console.log('🚀 Ensuring smart contract is deployed...');
        setContractDeploymentStatus('Deploying smart contract...');
        const deployment = await ensureContractDeployed();
        if (deployment.success) {
          setContractDeploymentStatus('Smart contract deployed successfully');
          console.log('📝 Registering route with smart contract...');
          attestationHash = await registerRouteWithContract(route, userPublicKey);
          setAttestationHash(attestationHash);
          setContractExplorerUrl(deployment.explorerUrl || getContractExplorerUrl());
          console.log('✅ Route registered with contract');
        } else {
          setContractDeploymentStatus(`Smart contract deployment failed: ${deployment.error}`);
          console.warn('⚠️ Smart contract deployment failed, continuing without attestation:', deployment.error);
        }
      } catch (contractError) {
        setContractDeploymentStatus(`Smart contract error: ${contractError}`);
        console.warn('⚠️ Smart contract registration failed, continuing without attestation:', contractError);
      }

      // 5. Build transaction XDR
      console.log('🏗️ Building transaction...');
      const xdr = await buildPathPaymentTransaction(userPublicKey, route);
      console.log('✅ Transaction built');

      // 6. Request signature from Freighter
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

      // 7. Finalize route with smart contract (if attestation exists)
      if (attestationHash) {
        try {
          console.log('✅ Finalizing route attestation...');
          const actualReceive = route.grossSend * route.effectiveRate;
          await finalizeRouteWithContract(attestationHash, actualReceive, result.hash);
          console.log('✅ Route attestation finalized');
        } catch (contractError) {
          console.warn('⚠️ Smart contract finalization failed:', contractError);
        }
      }

      // 8. Update state with success
      setTransactionHash(result.hash);
      setExplorerUrl(result.explorerUrl);

    } catch (error: any) {
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

      {/* Testnet Anchor - Get Demo Tokens */}
      <TestnetAnchor />

      {/* Responsive Layout: Stack on mobile, side-by-side on desktop */}
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
            rateMetadata={rateMetadata}
          />
        </div>
      </div>

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
              <div className="text-xs text-gray-600 mb-1">Send Amount</div>
              <div className="font-bold text-black text-sm md:text-base">
                {selectedRoute.grossSend.toLocaleString()} {selectedRoute.sourceFiat || selectedRoute.sendAsset.code}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Receive Amount</div>
              <div className="font-bold text-green-600 text-sm md:text-base">
                {(selectedRoute.grossSend * selectedRoute.effectiveRate).toLocaleString()} {selectedRoute.destinationFiat || selectedRoute.destAsset.code}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Fees</div>
              <div className="font-bold text-black text-sm md:text-base">
                {selectedRoute.totalFees.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Est. Time</div>
              <div className="font-bold text-black text-sm md:text-base">
                ~{selectedRoute.execution.estimatedConfirmationTime}s
              </div>
            </div>
          </div>

          {/* Wallet Connection Info */}
          {connectedPublicKey && !transactionHash && !error && (
            <div className="mb-4 p-3 bg-white border border-gray-200 text-xs">
              <span className="text-gray-600">Connected Wallet: </span>
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
            </div>
          )}

          {/* Success Display */}
          {transactionHash && explorerUrl && (
            <div className="mb-4 p-4 bg-green-100 border border-green-300 text-sm">
              <div className="font-bold text-green-800 mb-2">Transaction Hash:</div>
              <div className="font-mono text-xs text-green-700 mb-3 break-all">
                {transactionHash}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  View on Stellar Explorer →
                </a>
                {contractExplorerUrl && attestationHash && (
                  <a
                    href={contractExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Smart Contract →
                  </a>
                )}
              </div>
              {attestationHash && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <div className="font-bold text-blue-800 mb-1">Route Attestation:</div>
                  <div className="font-mono text-blue-700 break-all">
                    {attestationHash}
                  </div>
                  <div className="text-blue-600 mt-1">
                    ✅ Route registered and finalized on-chain
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contract Deployment Status */}
          {contractDeploymentStatus && (
            <div className="mb-4 p-4 bg-purple-100 border border-purple-300 text-sm">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <div className="text-purple-800">{contractDeploymentStatus}</div>
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
