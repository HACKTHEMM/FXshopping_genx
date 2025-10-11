'use client';

import { useState, useEffect } from 'react';
import { connectFreighter, signWithFreighter } from '@/lib/freighter-integration';
import * as StellarSdk from '@stellar/stellar-sdk';

interface AssetStatus {
  assetCode: string;
  issuer: string;
  hasTrustline: boolean;
  balance: number;
  limit: string;
}

interface BalanceResponse {
  success: boolean;
  accountExists: boolean;
  userPublicKey?: string;
  xlmBalance?: number;
  assets?: AssetStatus[];
  status?: {
    hasAllTrustlines: boolean;
    needsFunding: boolean;
    readyForDemo: boolean;
  };
  message?: string;
  friendbotUrl?: string;
}

export default function TestnetAnchor() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Connect wallet on mount
  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    try {
      const key = await connectFreighter();
      setPublicKey(key);
      await checkBalance(key);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const checkBalance = async (key: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/anchor/balance?publicKey=${key}`);
      const data = await response.json();
      setBalanceData(data);

      if (!data.accountExists) {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check balance');
    } finally {
      setLoading(false);
    }
  };

  const addTrustlines = async () => {
    if (!publicKey || !balanceData?.assets) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(publicKey);

      const builder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      // Add trustline operations for assets that don't have trustlines
      for (const asset of balanceData.assets) {
        if (!asset.hasTrustline) {
          const stellarAsset = new StellarSdk.Asset(asset.assetCode, asset.issuer);
          builder.addOperation(
            StellarSdk.Operation.changeTrust({
              asset: stellarAsset,
              limit: '1000000', // 1 million limit
            })
          );
        }
      }

      const transaction = builder.setTimeout(180).build();
      const xdr = transaction.toXDR();

      // Sign with Freighter
      const signedXdr = await signWithFreighter(xdr);
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        StellarSdk.Networks.TESTNET
      );

      // Submit
      const result = await server.submitTransaction(signedTx as StellarSdk.Transaction);

      setSuccess('Trustlines added successfully!');
      await checkBalance(publicKey);

    } catch (err: any) {
      console.error('Trustline error:', err);
      setError(err.message || 'Failed to add trustlines');
    } finally {
      setLoading(false);
    }
  };

  const requestTokens = async (assetCode: string, amount: number) => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/anchor/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPublicKey: publicKey,
          assetCode,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Deposit failed');
      }

      setSuccess(`${amount} ${assetCode} deposited successfully!`);
      await checkBalance(publicKey);

    } catch (err: any) {
      setError(err.message || 'Failed to request tokens');
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="bg-white border-2 border-blue-500 p-4 md:p-6 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">🏦</div>
          <h3 className="text-lg md:text-xl font-bold text-black mb-2">Testnet Anchor</h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect your Freighter wallet to get demo tokens
          </p>
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors rounded"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-500 p-4 md:p-6 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🏦</div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-black">Testnet Anchor</h3>
          <p className="text-xs text-gray-600">Get demo tokens for testing</p>
        </div>
      </div>

      {/* Connected Address */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
        <div className="text-xs text-gray-500 mb-1">Connected Wallet</div>
        <div className="text-xs md:text-sm font-mono text-black break-all">
          {publicKey}
        </div>
        {balanceData?.xlmBalance !== undefined && (
          <div className="text-xs text-gray-600 mt-1">
            XLM Balance: {balanceData.xlmBalance.toFixed(2)} XLM
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded">
          <div className="text-sm text-green-800">{success}</div>
        </div>
      )}

      {/* Account Not Found */}
      {balanceData && !balanceData.accountExists && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
          <div className="text-sm font-medium text-yellow-800 mb-2">Account Not Found</div>
          <div className="text-xs text-yellow-700 mb-3">
            Your account needs to be funded with XLM first using Friendbot.
          </div>
          <a
            href={balanceData.friendbotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-yellow-600 text-white px-4 py-2 text-xs font-medium hover:bg-yellow-700 transition-colors rounded"
          >
            Fund via Friendbot →
          </a>
        </div>
      )}

      {/* Trustlines Status */}
      {balanceData?.assets && (
        <div className="space-y-3">
          <div className="text-sm font-bold text-black">Asset Status:</div>

          {balanceData.assets.map((asset) => (
            <div
              key={asset.assetCode}
              className="p-3 border border-gray-200 rounded"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-black">{asset.assetCode}</div>
                  <div className="text-xs text-gray-500">
                    {asset.hasTrustline ? '✅ Trustline established' : '❌ No trustline'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-black">{asset.balance.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{asset.assetCode}</div>
                </div>
              </div>

              {asset.hasTrustline && (
                <div className="flex gap-2">
                  <button
                    onClick={() => requestTokens(asset.assetCode, 10000)}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-green-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get 10,000 {asset.assetCode}
                  </button>
                  <button
                    onClick={() => requestTokens(asset.assetCode, 1000)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get 1,000 {asset.assetCode}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Trustlines Button */}
      {balanceData?.status && !balanceData.status.hasAllTrustlines && (
        <button
          onClick={addTrustlines}
          disabled={loading}
          className="w-full mt-4 bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Add Trustlines'}
        </button>
      )}

      {/* Refresh Button */}
      <button
        onClick={() => publicKey && checkBalance(publicKey)}
        disabled={loading}
        className="w-full mt-2 bg-gray-600 text-white px-4 py-2 text-xs font-medium hover:bg-gray-700 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🔄 Refresh Balances
      </button>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="text-xs text-blue-800">
          <strong>ℹ️ This is a demo anchor:</strong> Tokens are for testnet only and have no real value.
          Use them to test the FX routing and path payment features.
        </div>
      </div>
    </div>
  );
}
