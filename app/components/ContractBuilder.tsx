'use client';

import { useState } from 'react';

interface ContractBuilderProps {
  publicKey?: string;
}

const CONTRACT_TEMPLATES = [
  { value: 'escrow', label: 'Escrow Contract', description: 'Multi-party escrow with release conditions' },
  { value: 'token', label: 'Token Contract', description: 'Custom token with minting/burning' },
  { value: 'payment', label: 'Payment Splitter', description: 'Split payments among multiple recipients' },
  { value: 'timelock', label: 'Timelock Contract', description: 'Time-locked fund release' },
  { value: 'vault', label: 'Vault Contract', description: 'Secure asset storage with access control' },
  { value: 'custom', label: 'Custom Contract', description: 'Define your own requirements' },
];

export default function ContractBuilder({}: ContractBuilderProps) {
  const [contractType, setContractType] = useState('escrow');
  const [requirements, setRequirements] = useState('');
  const [contractName, setContractName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [deployedContractId, setDeployedContractId] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'generated' | 'deployed'>('input');

  const handleGenerate = async () => {
    if (!requirements.trim() || !contractName.trim()) {
      setError('Please provide contract name and requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType,
          requirements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate contract');
      }

      setGeneratedCode(data.contractCode);
      setStep('generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate contract');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!generatedCode) {
      setError('No contract code to deploy');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractCode: generatedCode,
          contractName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Better error messaging with details
        let errorMsg = data.error || 'Failed to deploy contract';
        if (data.details) {
          errorMsg += '\n\nDetails: ' + data.details;
        }
        if (data.helpUrl) {
          errorMsg += '\n\nHelp: ' + data.helpUrl;
        }
        throw new Error(errorMsg);
      }

      setDeployedContractId(data.contractId);
      setStep('deployed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy contract';
      setError(errorMessage);
      console.error('Deployment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setGeneratedCode('');
    setDeployedContractId('');
    setError('');
    setRequirements('');
    setContractName('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Dynamic Smart Contract Builder</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Name
              </label>
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="my_contract"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Type
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CONTRACT_TEMPLATES.map((template) => (
                  <option key={template.value} value={template.value}>
                    {template.label} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Requirements
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe your contract requirements in detail. For example:&#10;- Create an escrow contract for currency exchange&#10;- Support multiple parties (buyer, seller, arbiter)&#10;- Allow arbiter to release or refund funds&#10;- Include deadline for automatic refund"
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating Contract...' : 'Generate Contract with AI'}
            </button>
          </div>
        )}

        {step === 'generated' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 font-medium">✓ Contract generated successfully!</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Contract Code
              </label>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96">
                <pre className="text-sm">{generatedCode}</pre>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDeploy}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Deploying...' : 'Deploy to Stellar Testnet'}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {step === 'deployed' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 font-medium mb-2">✓ Contract deployed successfully!</p>
              <p className="text-sm text-gray-700">Contract ID:</p>
              <code className="block mt-2 p-2 bg-white rounded border border-green-300 text-sm break-all">
                {deployedContractId}
              </code>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deployed Contract Code
              </label>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto max-h-96">
                <pre className="text-sm">{generatedCode}</pre>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-gray-700 mb-2">Next Steps:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Save the contract ID for future interactions</li>
                <li>Test the contract functions on Stellar testnet</li>
                <li>Integrate the contract into your application</li>
              </ul>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Another Contract
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes:</h3>
        <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
          <li>Contracts are deployed to Stellar testnet (not mainnet)</li>
          <li>Ensure Soroban CLI is installed and configured</li>
          <li>Generated contracts should be reviewed before production use</li>
          <li>Deployment requires network fees (testnet XLM)</li>
        </ul>
      </div>
    </div>
  );
}
