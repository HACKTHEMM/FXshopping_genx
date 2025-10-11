'use client';

import React, { useState } from 'react';

export default function WormholeTestPage() {
  const [bridgeResult, setBridgeResult] = useState<any>(null);
  const [messageResult, setMessageResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testBridge = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wormhole/bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromChain: 'stellar',
          toChain: 'solana',
          token: 'USDC',
          amount: '100',
          recipientAddress: 'test-solana-address',
        }),
      });

      const result = await response.json();
      setBridgeResult(result);
    } catch (error) {
      console.error('Bridge test failed:', error);
      setBridgeResult({ success: false, error: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const testMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wormhole/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromChain: 'stellar',
          toChain: 'solana',
          messagePayload: JSON.stringify({
            type: 'fx_attestation',
            routeId: 'route_test_123',
            sourceAmount: '1000000',
            targetAmount: '995000',
            exchangeRate: '0.995',
          }),
        }),
      });

      const result = await response.json();
      setMessageResult(result);
    } catch (error) {
      console.error('Message test failed:', error);
      setMessageResult({ success: false, error: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Wormhole Integration Test
        </h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bridge Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">
              Token Bridge Test
            </h2>
            <p className="text-gray-600 mb-4">
              Test bridging USDC from Stellar to Solana
            </p>
            
            <button
              onClick={testBridge}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : 'Test Bridge'}
            </button>

            {bridgeResult && (
              <div className={`mt-4 p-4 rounded ${
                bridgeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className={`font-semibold ${
                  bridgeResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {bridgeResult.success ? '✅ Bridge Successful!' : '❌ Bridge Failed'}
                </h3>
                <pre className="text-sm mt-2 overflow-auto">
                  {JSON.stringify(bridgeResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Message Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">
              Cross-Chain Message Test
            </h2>
            <p className="text-gray-600 mb-4">
              Test sending FX route attestation via GMP
            </p>
            
            <button
              onClick={testMessage}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : 'Test Message'}
            </button>

            {messageResult && (
              <div className={`mt-4 p-4 rounded ${
                messageResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className={`font-semibold ${
                  messageResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {messageResult.success ? '✅ Message Sent!' : '❌ Message Failed'}
                </h3>
                <pre className="text-sm mt-2 overflow-auto">
                  {JSON.stringify(messageResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Integration Info */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            Integration Status
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-green-600 mb-2">✅ API Endpoints</h3>
              <p>Bridge and Message APIs are working</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-green-600 mb-2">✅ Validation</h3>
              <p>Input validation and error handling active</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-yellow-600 mb-2">⚠️ Mock Mode</h3>
              <p>Using mock implementations for testing</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Next Steps
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Install Wormhole SDK: <code className="bg-gray-200 px-2 py-1 rounded">npm install @wormhole-foundation/sdk</code></li>
            <li>Replace mock implementations with real Wormhole SDK calls</li>
            <li>Add your RPC URLs to environment variables</li>
            <li>Integrate with your existing FX routing system</li>
            <li>Add VAA verification for production use</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
