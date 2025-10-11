'use client';

import { useState } from 'react';
import { RouteQuote } from '@/lib/types/route';
import PaymentForm from './PaymentForm';
import RouteComparison from './RouteComparison';

interface RoutesProps {
  publicKey?: string;
}

export default function Routes({ publicKey }: RoutesProps) {
  const [routes, setRoutes] = useState<RouteQuote[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteQuote | null>(null);
  const [contractGenerating, setContractGenerating] = useState(false);
  const [contractGenerated, setContractGenerated] = useState(false);
  const [contractCode, setContractCode] = useState<string>('');
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractDeploying, setContractDeploying] = useState(false);
  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractId, setContractId] = useState<string>('');
  const [deployError, setDeployError] = useState<string | null>(null);
  const [optimizationStatus, setOptimizationStatus] = useState<string>('');

  const handleRoutesFound = (foundRoutes: RouteQuote[]) => {
    setRoutes(foundRoutes);
    setSelectedRoute(null); // Reset selection
    setContractGenerated(false);
    setContractCode('');
    setContractError(null);
    setContractDeployed(false);
    setContractId('');
    setDeployError(null);
    setOptimizationStatus('');
    
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
    setContractError(null);
    setDeployError(null);
    
    // Generate smart contract for this route
    await generateRouteContract(route);
  };

  const generateRouteContract = async (route: RouteQuote) => {
    setContractGenerating(true);
    setContractError(null);

    try {
      // Build detailed requirements for the contract
      const contractRequirements = `
Create a route payment smart contract with the following specifications:

Route Details:
- Route ID: ${route.routeId}
- Provider: ${route.providerName}
- From: ${route.grossSend} ${route.sourceFiat || route.sendAsset.code}
- To: ${route.netReceive} ${route.destinationFiat || route.destAsset.code}
- Effective Rate: ${route.effectiveRate.toFixed(6)}
- Total Fees: ${route.totalFees.toFixed(4)}
- Risk Score: ${(route.riskScore * 100).toFixed(2)}%

Route Legs (${route.legs.length} steps):
${route.legs.map((leg, idx) => `
  Leg ${idx + 1} (${leg.type}):
  - From: ${leg.from}
  - To: ${leg.to}
  - Rate: ${leg.rate.toFixed(6)}
  - Estimated Time: ${leg.estSeconds}s
  - Fees: ${leg.fees.map(f => `${f.amount} ${f.asset} (${f.kind})`).join(', ')}
  - Provider: ${leg.provider || 'N/A'}
`).join('\n')}

Contract Requirements:
1. Store the complete route information including all legs
2. Track the payment execution status (Pending, InProgress, Completed, Failed)
3. Validate sender authorization before executing payments
4. Record timestamp of initiation and completion
5. Allow querying route details and execution status
6. Include functions to:
   - initialize(env, sender, route_id, source_amount, dest_amount)
   - execute_payment(env, sender) - validates and marks as in progress
   - complete_payment(env) - marks as completed with timestamp
   - get_route_status(env) - returns current status
   - get_route_details(env) - returns route information
7. Implement proper error handling for:
   - Unauthorized access
   - Already initialized
   - Invalid state transitions
   - Payment execution failures
8. Use storage for persistence of route data and status
`;

      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: 'Route Payment Escrow',
          requirements: contractRequirements,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate contract');
      }

      const data = await response.json();
      setContractCode(data.contractCode);
      setContractGenerated(true);

    } catch (error) {
      console.error('Contract generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate smart contract';
      setContractError(errorMessage);
    } finally {
      setContractGenerating(false);
    }
  };

  const deployContract = async () => {
    if (!selectedRoute || !contractCode) return;

    setContractDeploying(true);
    setDeployError(null);

    try {
      const contractName = `route_${selectedRoute.routeId.replace(/[^a-z0-9]/gi, '_')}`;
      
      const response = await fetch('/api/contracts/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractCode,
          contractName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deploy contract');
      }

      const data = await response.json();
      setContractId(data.contractId);
      setOptimizationStatus(data.optimizationStatus || 'Optimized');
      setContractDeployed(true);

    } catch (error) {
      console.error('Contract deployment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deploy smart contract';
      setDeployError(errorMessage);
    } finally {
      setContractDeploying(false);
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
          />
        </div>
      </div>

      {/* Selected Route Summary (if any) - Mobile Optimized */}
      {selectedRoute && (
        <div className="bg-blue-50 border-2 border-blue-500 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-black mb-3 md:mb-4">
            ✓ Route Selected: {selectedRoute.providerName}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
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
          
          {/* Contract Generation Status */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            {contractGenerating && (
              <div className="flex items-center gap-2 text-blue-600 mb-3">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">Generating smart contract for this route...</span>
              </div>
            )}
            
            {contractError && (
              <div className="bg-red-50 border border-red-200 p-3 mb-3">
                <p className="text-sm text-red-700">
                  <strong>Contract Generation Error:</strong> {contractError}
                </p>
              </div>
            )}
            
            {contractGenerated && !contractError && (
              <div className="bg-green-50 border border-green-200 p-3 mb-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 mb-1">
                      ✓ Smart Contract Generated Successfully
                    </p>
                    <p className="text-xs text-green-600">
                      Route payment contract created with {selectedRoute.legs.length} legs and complete transaction details.
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-green-700 hover:text-green-800 font-medium">
                        View Contract Code
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-900 text-green-400 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        {contractCode}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            )}
            
            {deployError && (
              <div className="bg-red-50 border border-red-200 p-3 mb-3">
                <p className="text-sm text-red-700">
                  <strong>Deployment Error:</strong> {deployError}
                </p>
              </div>
            )}
            
            {contractDeployed && contractId && (
              <div className="bg-purple-50 border border-purple-200 p-3 mb-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-700 mb-1">
                      ✓ Contract Deployed to Stellar Testnet
                    </p>
                    <p className="text-xs text-purple-600 mb-2">
                      Your route payment contract is now live on the blockchain!
                    </p>
                    {optimizationStatus && (
                      <p className="text-xs text-purple-500 mb-2 italic">
                        {optimizationStatus}
                      </p>
                    )}
                    <div className="bg-white p-2 border border-purple-200">
                      <p className="text-xs text-gray-600 mb-1">Contract ID:</p>
                      <code className="text-xs text-purple-700 break-all font-mono">{contractId}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className="flex-1 bg-blue-600 text-white px-6 py-3 text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={() => alert('Freighter wallet integration coming next!')}
                disabled={contractGenerating || !contractGenerated}
              >
                {contractGenerating ? 'Generating Contract...' : 'Sign Transaction with Freighter'}
              </button>
              
              {contractGenerated && !contractDeployed && (
                <button
                  className="bg-purple-600 text-white px-6 py-3 text-sm font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={deployContract}
                  disabled={contractDeploying}
                >
                  {contractDeploying ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Deploying...</span>
                    </>
                  ) : (
                    'Deploy to Testnet'
                  )}
                </button>
              )}
              
              {contractGenerated && (
                <button
                  className="bg-green-600 text-white px-6 py-3 text-sm font-medium hover:bg-green-700 transition-colors"
                  onClick={() => {
                    const blob = new Blob([contractCode], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `route-contract-${selectedRoute.routeId}.rs`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Contract
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
