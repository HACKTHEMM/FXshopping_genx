'use client';

import { useState } from 'react';

export default function TestWormhole() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<string>('');

  const testBridge = async () => {
    setLoading(true);
    setTestType('Token Bridge');
    try {
      const response = await fetch('/api/wormhole/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: 'stellar',
          toChain: 'solana',
          token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHXCN3A3A',
          amount: '100',
          recipientAddress: 'test_recipient_address',
          senderPrivateKey: 'test_private_key'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      });
    }
    setLoading(false);
  };

  const testMessage = async () => {
    setLoading(true);
    setTestType('Cross-Chain Message');
    try {
      const response = await fetch('/api/wormhole/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: 'stellar',
          toChain: 'ethereum',
          messagePayload: JSON.stringify({ 
            routeId: 'test_route_123',
            sourceAmount: '100',
            targetAmount: '95',
            exchangeRate: '0.95',
            timestamp: Date.now(),
            validator: 'stellar_validator_1'
          }),
          senderPrivateKey: 'test_private_key',
          messageType: 'fx_route_attestation'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      });
    }
    setLoading(false);
  };

  const testVAA = async () => {
    setLoading(true);
    setTestType('VAA Retrieval');
    try {
      const response = await fetch('/api/wormhole/vaa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emitterAddress: 'test_emitter_address',
          sequence: '12345',
          sourceChain: 'stellar'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      });
    }
    setLoading(false);
  };

  const getSupportedChains = async () => {
    setLoading(true);
    setTestType('Supported Chains');
    try {
      const response = await fetch('/api/wormhole/bridge');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      });
    }
    setLoading(false);
  };

  const getMessageTypes = async () => {
    setLoading(true);
    setTestType('Message Types');
    try {
      const response = await fetch('/api/wormhole/message');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      });
    }
    setLoading(false);
  };

  const clearResult = () => {
    setResult(null);
    setTestType('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Wormhole Integration Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test your Wormhole integration for cross-chain token bridging and messaging
          </p>

          {/* Test Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <button 
              onClick={testBridge}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🌉 Test Token Bridge
            </button>
            
            <button 
              onClick={testMessage}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📨 Test Cross-Chain Message
            </button>

            <button 
              onClick={testVAA}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ✅ Test VAA Retrieval
            </button>

            <button 
              onClick={getSupportedChains}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🔗 Get Supported Chains
            </button>

            <button 
              onClick={getMessageTypes}
              disabled={loading}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📋 Get Message Types
            </button>

            <button 
              onClick={clearResult}
              disabled={loading}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ Clear Results
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
                Testing {testType}...
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {testType} Result
                </h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.success 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.success ? '✅ Success' : '❌ Error'}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📖 How to Use This Test Page
            </h3>
            <div className="text-blue-800 space-y-2">
              <p><strong>1. Token Bridge:</strong> Tests bridging tokens between Stellar and Solana</p>
              <p><strong>2. Cross-Chain Message:</strong> Tests sending FX route attestation data</p>
              <p><strong>3. VAA Retrieval:</strong> Tests retrieving Verifiable Action Approvals</p>
              <p><strong>4. Supported Chains:</strong> Shows available chains and tokens</p>
              <p><strong>5. Message Types:</strong> Shows supported message types</p>
            </div>
            <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> This uses mock data for testing. Replace with actual Wormhole SDK calls for production.
              </p>
            </div>
          </div>

          {/* API Documentation */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              🔗 API Endpoints
            </h3>
            <div className="space-y-3 text-sm">
              <div className="font-mono bg-white p-2 rounded border">
                <span className="text-green-600">POST</span> /api/wormhole/bridge
              </div>
              <div className="font-mono bg-white p-2 rounded border">
                <span className="text-green-600">POST</span> /api/wormhole/message
              </div>
              <div className="font-mono bg-white p-2 rounded border">
                <span className="text-green-600">POST</span> /api/wormhole/vaa
              </div>
              <div className="font-mono bg-white p-2 rounded border">
                <span className="text-blue-600">GET</span> /api/wormhole/bridge
              </div>
              <div className="font-mono bg-white p-2 rounded border">
                <span className="text-blue-600">GET</span> /api/wormhole/message
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
