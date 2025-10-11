'use client';

import { useState } from 'react';
import { 
  getAllRouteAttestations, 
  clearRouteAttestations,
  RouteAttestation,
  DEPLOYMENT_INSTRUCTIONS 
} from '@/lib/smart-contract-integration';

export default function ContractDebugPanel() {
  const [attestations, setAttestations] = useState<RouteAttestation[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const loadAttestations = () => {
    setAttestations(getAllRouteAttestations());
  };

  const handleClearAll = () => {
    if (confirm('Clear all route attestations?')) {
      clearRouteAttestations();
      setAttestations([]);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => {
          setShowPanel(!showPanel);
          if (!showPanel) loadAttestations();
        }}
        className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Smart Contract Debug Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Debug Panel */}
      {showPanel && (
        <div className="absolute bottom-16 right-0 w-96 max-w-[calc(100vw-2rem)] bg-white border-2 border-purple-500 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold text-sm">Smart Contract Debug</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-80 overflow-y-auto">
            {/* Status */}
            <div className="mb-4 p-3 bg-gray-50 rounded border">
              <div className="text-xs space-y-1">
                <div><strong>Contract Status:</strong> {DEPLOYMENT_INSTRUCTIONS.status}</div>
                <div><strong>Address:</strong> <span className="font-mono text-xs">{DEPLOYMENT_INSTRUCTIONS.contractAddress}</span></div>
                <div><strong>Attestations:</strong> {attestations.length} stored locally</div>
              </div>
            </div>

            {/* Controls */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={loadAttestations}
                className="flex-1 bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors rounded"
              >
                Refresh
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 bg-red-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-red-700 transition-colors rounded"
              >
                Clear All
              </button>
            </div>

            {/* Attestations List */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900">Route Attestations:</h4>
              
              {attestations.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No route attestations yet.<br />
                  Select a route to create one!
                </div>
              ) : (
                attestations.map((attestation, index) => (
                  <div 
                    key={`${attestation.routeId}-${index}`}
                    className={`p-3 border rounded text-xs ${
                      attestation.status === 'finalized' 
                        ? 'bg-green-50 border-green-200' 
                        : attestation.status === 'failed'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold font-mono">{attestation.routeId}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        attestation.status === 'finalized' 
                          ? 'bg-green-200 text-green-800' 
                          : attestation.status === 'failed'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {attestation.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-gray-600">
                      <div><strong>Expected:</strong> {attestation.expectedNet.toFixed(6)}</div>
                      {attestation.actualNet !== undefined && (
                        <div><strong>Actual:</strong> {attestation.actualNet.toFixed(6)}</div>
                      )}
                      {attestation.variance !== undefined && (
                        <div className={`font-medium ${attestation.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <strong>Variance:</strong> {attestation.variance > 0 ? '+' : ''}{attestation.variance.toFixed(6)}
                        </div>
                      )}
                      <div><strong>Created:</strong> {formatTimestamp(attestation.timestamp)}</div>
                      {attestation.transactionHash && (
                        <div><strong>TX:</strong> <span className="font-mono">{attestation.transactionHash}</span></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}