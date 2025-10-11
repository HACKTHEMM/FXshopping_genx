'use client';

import { useState, useEffect } from 'react';
import { RouteQuote } from '@/lib/types/route';
import PaymentForm from './PaymentForm';
import RouteComparison from './RouteComparison';
import TestnetAnchor from './TestnetAnchor';
import { connectFreighter, signWithFreighter, parseFreighterError, isFreighterInstalled } from '@/lib/freighter-integration';
import { buildPathPaymentTransaction, submitTransaction, hasTrustline, getBalance } from '@/lib/stellar-transaction';
import { establishTrustline, checkTrustline } from '@/lib/trustline-manager';
import { checkAccountStatus, activateAccountWithFriendbot } from '@/lib/account-activation';

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
  const [missingTrustline, setMissingTrustline] = useState<{ asset: any; type: 'source' | 'destination' } | null>(null);
  const [trustlineLoading, setTrustlineLoading] = useState(false);
  const [freighterAvailable, setFreighterAvailable] = useState<boolean | null>(null);
  const [accountNotActivated, setAccountNotActivated] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);

  // Check if Freighter is installed on mount
  useEffect(() => {
    const checkFreighter = async () => {
      const installed = await isFreighterInstalled();
      setFreighterAvailable(installed);
      if (!installed) {
        console.warn('⚠️ Freighter wallet not detected');
      }
    };
    checkFreighter();
  }, []);

  const handleRoutesFound = (foundRoutes: RouteQuote[], metadata?: any) => {
    setRoutes(foundRoutes);
    setRateMetadata(metadata);
    setSelectedRoute(null); // Reset selection
    setMissingTrustline(null); // Reset trustline error

    // Smooth scroll to results on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const resultsSection = document.getElementById('route-results');
        resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleActivateAccount = async () => {
    if (!connectedPublicKey) return;

    setActivationLoading(true);
    setError(null);

    try {
      console.log('🤖 Activating account with Friendbot...');

      const result = await activateAccountWithFriendbot(connectedPublicKey);

      console.log('✅ Account activated successfully!');
      console.log('  Balance:', result.balance, 'XLM');
      console.log('  Explorer:', result.explorerUrl);

      // Clear the account not activated flag
      setAccountNotActivated(false);

      // Show success message
      alert(`✅ Account activated successfully!\n\nYou received ${result.balance} XLM from Friendbot.\n\nYou can now proceed with transactions.`);

      // Retry the transaction automatically
      if (selectedRoute) {
        handleSelectRoute(selectedRoute);
      }

    } catch (err: any) {
      console.error('❌ Account activation failed:', err);
      setError(
        `Failed to activate account.\n\n` +
        `Please try manually:\n` +
        `1. Visit https://friendbot.stellar.org\n` +
        `2. Enter your address: ${connectedPublicKey.substring(0, 20)}...\n` +
        `3. Click "Get test network lumens"\n\n` +
        `Error: ${err.message}`
      );
    } finally {
      setActivationLoading(false);
    }
  };

  const handleEstablishTrustline = async () => {
    if (!missingTrustline || !connectedPublicKey) return;

    setTrustlineLoading(true);
    setError(null);

    try {
      console.log('🔗 Establishing trustline for', missingTrustline.asset.code);

      const result = await establishTrustline(connectedPublicKey, {
        code: missingTrustline.asset.code,
        issuer: missingTrustline.asset.issuer,
      });

      console.log('✅ Trustline established successfully!');
      console.log('  Transaction:', result.hash);

      // Clear the missing trustline error
      setMissingTrustline(null);

      // Show success message
      alert(`✅ Trustline established for ${missingTrustline.asset.code}!\n\nYou can now proceed with the transaction.`);

      // Retry the transaction automatically
      if (selectedRoute) {
        handleSelectRoute(selectedRoute);
      }

    } catch (err: any) {
      console.error('❌ Trustline establishment failed:', err);
      const friendlyError = parseFreighterError(err);
      setError(friendlyError);
    } finally {
      setTrustlineLoading(false);
    }
  };

  const handleSelectRoute = async (route: RouteQuote) => {
    setSelectedRoute(route);
    setLoading(true);
    setError(null);
    setTransactionHash(null);
    setExplorerUrl(null);
    setMissingTrustline(null);

    try {
      // 0. Check if Freighter is installed
      if (freighterAvailable === false) {
        throw new Error(
          'Freighter wallet not detected.\n\n' +
          'Please install the Freighter browser extension from:\n' +
          'https://www.freighter.app/'
        );
      }

      // 1. Connect to Freighter wallet
      console.log('🔌 Connecting to Freighter wallet...');
      const userPublicKey = await connectFreighter();
      setConnectedPublicKey(userPublicKey);
      console.log('✅ Connected:', userPublicKey.substring(0, 8) + '...');

      // 1.5. Check if account is activated on the network
      console.log('🔍 Checking account status on Stellar testnet...');
      const accountStatus = await checkAccountStatus(userPublicKey);

      if (!accountStatus.activated) {
        setAccountNotActivated(true);
        throw new Error(
          'Account not activated on Stellar testnet.\n\n' +
          'Your Freighter wallet needs to be funded with XLM to activate it.\n\n' +
          'Click "Activate Account with Friendbot" below to get free testnet XLM.'
        );
      }

      console.log('✅ Account is activated');
      console.log('  Balance:', accountStatus.balance, 'XLM');

      // 2. Check if user has trustline for source asset
      console.log('🔍 Checking trustline for source asset:', route.sendAsset.code);
      const hasSourceTrustline = await hasTrustline(userPublicKey, route.sendAsset);
      if (!hasSourceTrustline && route.sendAsset.issuer) {
        throw new Error(
          `MISSING_TRUSTLINE_SOURCE:${route.sendAsset.code}:${route.sendAsset.issuer}`
        );
      }

      // 3. Check if user has trustline for destination asset
      console.log('🔍 Checking trustline for destination asset:', route.destAsset.code);
      const hasDestTrustline = await hasTrustline(userPublicKey, route.destAsset);
      if (!hasDestTrustline && route.destAsset.issuer) {
        throw new Error(
          `MISSING_TRUSTLINE_DEST:${route.destAsset.code}:${route.destAsset.issuer}`
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

      // 4. Build transaction XDR
      console.log('🏗️ Building transaction...');
      const xdr = await buildPathPaymentTransaction(userPublicKey, route);
      console.log('✅ Transaction built');

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

    } catch (error: any) {
      console.error('❌ Transaction error:', error);
      console.log('🔍 Error message:', error.message);

      // Check if this is a missing trustline error
      if (error.message && error.message.startsWith('MISSING_TRUSTLINE_')) {
        console.log('✅ Detected MISSING_TRUSTLINE error');
        const parts = error.message.split(':');
        const type = parts[0].includes('SOURCE') ? 'source' : 'destination';
        const code = parts[1];
        const issuer = parts[2];

        console.log('📊 Trustline details:', { type, code, issuer });

        // Set the missing trustline state so the button appears
        const trustlineState = {
          asset: { code, issuer },
          type: type as 'source' | 'destination',
        };

        console.log('💾 Setting missingTrustline state:', trustlineState);
        setMissingTrustline(trustlineState);

        // Set user-friendly error message
        const errorMessage = `Missing trustline for ${code}.\n\n` +
          `Click "Establish Trustline" below to add this asset to your wallet.\n\n` +
          `Issuer: ${issuer.substring(0, 8)}...`;

        console.log('📝 Setting error message:', errorMessage);
        setError(errorMessage);

        console.log('✅ State updates queued - button should appear after re-render');
      } else {
        console.log('⚠️ Not a trustline error, using parseFreighterError');
        // Handle other errors normally
        const friendlyError = parseFreighterError(error);
        setError(friendlyError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Freighter Wallet Warning */}
      {freighterAvailable === false && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Freighter Wallet Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  To execute transactions, please install the Freighter browser extension.{' '}
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-yellow-600"
                  >
                    Install Freighter →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {selectedRoute.netReceive.toLocaleString()} {selectedRoute.destinationFiat || selectedRoute.destAsset.code}
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

              {/* Account Activation Button */}
              {accountNotActivated && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <button
                    onClick={handleActivateAccount}
                    disabled={activationLoading}
                    className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {activationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Activate Account with Friendbot</span>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-xs text-red-600">
                    This will fund your account with 10,000 XLM from Friendbot (testnet only). This is required before you can make transactions.
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    Your address: <span className="font-mono">{connectedPublicKey?.substring(0, 20)}...</span>
                  </p>
                </div>
              )}

              {/* Trustline Establishment Button */}
              {missingTrustline && !accountNotActivated && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="mb-3 text-xs bg-yellow-100 p-2 border border-yellow-300">
                    DEBUG: Button section is rendering! missingTrustline={JSON.stringify(missingTrustline)}
                  </p>
                  <button
                    onClick={handleEstablishTrustline}
                    disabled={trustlineLoading}
                    className="w-full md:w-auto bg-red-600 text-white px-6 py-3 text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {trustlineLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Establishing Trustline...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Establish Trustline for {missingTrustline.asset.code}</span>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-xs text-red-600">
                    This will add {missingTrustline.asset.code} to your Freighter wallet so you can hold and trade this asset.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Display */}
          {transactionHash && explorerUrl && (
            <div className="mb-4 p-4 bg-green-100 border border-green-300 text-sm">
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
                View on Stellar Explorer →
              </a>
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
