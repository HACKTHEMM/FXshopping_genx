
'use client';

import { useState } from 'react';
import { executeContractPayment, simulateContractPayment } from '@/lib/contract-payment-integration';

export default function StandaloneContractTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testStandaloneExecution = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🚀 Testing STANDALONE contract execution...');
      
      const params = {
        fromAsset: 'XLM',
        toAsset: 'XLM',
        amount: '1.0',
        senderPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Will be generated
        receiverPublicKey: 'GB3BLQIU5MVDUSOLKOQ2FKZSYKRFCTSFYA27V2BS32ZVCYZHQL5DAABN'
      };

      const result = await executeContractPayment(params);
      setResult(result);
      
    } catch (error: any) {
      setError(error.message || 'Standalone execution failed');
      console.error('❌ Standalone test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSimulation = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 Testing standalone simulation...');
      
      const params = {
        fromAsset: 'XLM',
        toAsset: 'XLM', 
        amount: '1.0',
        senderPublicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        receiverPublicKey: 'GB3BLQIU5MVDUSOLKOQ2FKZSYKRFCTSFYA27V2BS32ZVCYZHQL5DAABN'
      };

      const result = await simulateContractPayment(params);
      setResult(result);
      
    } catch (error: any) {
      setError(error.message || 'Simulation failed');
      console.error('❌ Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Standalone Smart Contract Executor</h1>
      
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">🚀 No Stellar SDK Dependencies!</h2>
        <ul className="list-disc list-inside space-y-2 text-blue-700">
          <li><strong>Pure RPC Calls:</strong> Direct communication with Soroban RPC server</li>
          <li><strong>TweetNaCl Crypto:</strong> Ed25519 signing without Stellar SDK</li>
          <li><strong>Zero Dependencies:</strong> No complex SDK compatibility issues</li>
          <li><strong>Real On-Chain Execution:</strong> Actual smart contract transactions</li>
        </ul>
      </div>

      {/* Test Controls */}
      <div className="space-y-4 mb-8">
        <button
          onClick={testSimulation}
          disabled={loading}
          className="bg-yellow-500 text-white px-6 py-3 rounded hover:bg-yellow-600 disabled:opacity-50 mr-4"
        >
          {loading ? 'Testing...' : 'Test Simulation (Safe)'}
        </button>
        
        <button
          onClick={testStandaloneExecution}
          disabled={loading}
          className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Executing...' : 'Test REAL Execution (On-Chain)'}
        </button>
      </div>

      {/* Contract Info */}
      <div className="bg-gray-50 p-4 rounded mb-8">
        <h3 className="font-semibold mb-2">Contract Configuration:</h3>
        <p><strong>Contract ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded text-sm">{process.env.NEXT_PUBLIC_ROUTE_CONTRACT_ID}</code></p>
        <p><strong>Network:</strong> Stellar Testnet</p>
        <p><strong>RPC URL:</strong> https://soroban-testnet.stellar.org:443</p>
        <p><strong>Function:</strong> execute_simple_payment</p>
      </div>

      {/* Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-red-600 font-mono text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Standalone Execution Result</h3>
          <div className="space-y-3">
            <div>
              <strong>Success:</strong> 
              <span className={`ml-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            
            {result.transactionHash && (
              <div>
                <strong>Transaction Hash:</strong>
                <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm break-all">
                  {result.transactionHash}
                </code>
              </div>
            )}
            
            {result.actualReceived && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <strong>Amount Received:</strong>
                  <p className="text-green-600">{result.actualReceived} XLM</p>
                </div>
                <div>
                  <strong>Contract Fee:</strong>
                  <p className="text-orange-600">{result.fee} XLM</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technical Details */}
      <div className="bg-indigo-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-indigo-800 mb-4">🔧 Technical Implementation</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Libraries Used:</h4>
            <ul className="list-disc list-inside space-y-1 text-indigo-700">
              <li>tweetnacl - Ed25519 cryptography</li>
              <li>Native Fetch API - HTTP requests</li>
              <li>No Stellar SDK dependencies</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Process Flow:</h4>
            <ol className="list-decimal list-inside space-y-1 text-indigo-700">
              <li>Generate ed25519 keypair</li>
              <li>Fund account via Friendbot</li>
              <li>Build RPC call payload</li>
              <li>Sign with TweetNaCl</li>
              <li>Submit via Soroban RPC</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Status */}
      {loading && (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Processing standalone contract call...</p>
        </div>
      )}
    </div>
  );
}