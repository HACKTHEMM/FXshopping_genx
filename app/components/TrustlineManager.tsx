/**
 * Stellar Trustline Manager Component
 * Allows users to create trustlines for all supported assets
 */

'use client';

import { useState, useEffect } from 'react';
import { createAllTrustlines, checkMissingTrustlines, getAllSupportedAssets } from '@/lib/stellar-trustlines';

interface TrustlineStatus {
  code: string;
  issuer: string;
  name: string;
  exists: boolean;
  transactionHash?: string;
  error?: string;
}

interface TrustlineManagerProps {
  userPublicKey?: string;
  onTrustlineCreated?: (asset: string) => void;
}

export default function TrustlineManager({ userPublicKey, onTrustlineCreated }: TrustlineManagerProps) {
  const [loading, setLoading] = useState(false);
  const [trustlineStatus, setTrustlineStatus] = useState<TrustlineStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load trustline status when userPublicKey changes
  useEffect(() => {
    if (userPublicKey) {
      checkTrustlines();
    }
  }, [userPublicKey]);

  const checkTrustlines = async () => {
    if (!userPublicKey) return;

    try {
      setLoading(true);
      setError(null);

      const result = await checkMissingTrustlines(userPublicKey);
      const allAssets = getAllSupportedAssets();

      const status: TrustlineStatus[] = allAssets.map(asset => ({
        code: asset.code,
        issuer: asset.issuer,
        name: asset.name,
        exists: result.existing.some(existing => existing.code === asset.code)
      }));

      setTrustlineStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check trustlines');
    } finally {
      setLoading(false);
    }
  };

  const createAllTrustlinesForUser = async () => {
    if (!userPublicKey) return;

    try {
      setLoading(true);
      setError(null);

      const result = await createAllTrustlines(userPublicKey);
      
      if (result.success) {
        // Update status based on results
        const updatedStatus = trustlineStatus.map(status => {
          const resultItem = result.results.find(r => r.asset === status.code);
          if (resultItem) {
            return {
              ...status,
              exists: resultItem.success,
              transactionHash: resultItem.transactionHash,
              error: resultItem.error
            };
          }
          return status;
        });

        setTrustlineStatus(updatedStatus);

        // Notify parent component
        if (onTrustlineCreated) {
          result.results.forEach(r => {
            if (r.success) {
              onTrustlineCreated(r.asset);
            }
          });
        }
      } else {
        setError('Failed to create trustlines');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trustlines');
    } finally {
      setLoading(false);
    }
  };

  const missingCount = trustlineStatus.filter(status => !status.exists).length;
  const existingCount = trustlineStatus.filter(status => status.exists).length;

  if (!userPublicKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <div className="flex items-center">
          <div className="text-yellow-600 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Wallet Required</h3>
            <p className="text-sm text-yellow-700">Please connect your Freighter wallet to manage trustlines.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black mb-2">Stellar Trustline Manager</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create trustlines for all supported assets to enable cross-chain bridging.
        </p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-blue-600">Total Assets</div>
            <div className="text-lg font-semibold text-blue-900">{trustlineStatus.length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-green-600">Existing</div>
            <div className="text-lg font-semibold text-green-900">{existingCount}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-sm text-orange-600">Missing</div>
            <div className="text-lg font-semibold text-orange-900">{missingCount}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mb-4">
          <button
            onClick={createAllTrustlinesForUser}
            disabled={loading || missingCount === 0}
            className="bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : `Create All Missing Trustlines (${missingCount})`}
          </button>
          
          <button
            onClick={checkTrustlines}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Asset Details */}
        {showDetails && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Asset Trustline Status</h4>
            {trustlineStatus.map((status, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status.exists ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-900">{status.code}</div>
                    <div className="text-sm text-gray-600">{status.name}</div>
                  </div>
                </div>
                <div className="text-sm">
                  {status.exists ? (
                    <span className="text-green-600 font-medium">✓ Trustline Exists</span>
                  ) : (
                    <span className="text-orange-600 font-medium">⚠ Missing Trustline</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-900 mb-2">How Trustlines Work</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Trustlines allow you to hold and transact with issued assets on Stellar</li>
            <li>• Each asset requires a separate trustline</li>
            <li>• Trustlines are free to create but require a small transaction fee</li>
            <li>• You can set custom limits for each trustline</li>
            <li>• Trustlines are required before you can receive bridged assets</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
