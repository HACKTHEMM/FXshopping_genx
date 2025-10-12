/**
 * Client-side Smart Contract Integration
 * Handles contract interactions from the frontend
 */

import { RouteQuote } from './types/route';

export interface DeploymentResult {
  success: boolean;
  contractId?: string;
  error?: string;
  explorerUrl?: string;
  status?: string;
}

export interface RouteAttestation {
  routeId: string;
  expectedReceive: number;
  actualReceive?: number;
  txHash?: string;
  variance?: number;
  status: 'registered' | 'finalized' | 'failed';
  attestationHash: string;
}

export interface ContractRouteData {
  route_id: string;
  expected_net: number;
  actual_net?: number;
  sender: string;
  registered_at: number;
  finalized_at?: number;
  tx_hash?: string;
  status: string;
  variance?: number;
}

/**
 * Ensure contract is deployed and ready
 */
export async function ensureContractDeployed(): Promise<DeploymentResult> {
  try {
    const response = await fetch('/api/contract/deploy', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: unknown) {
    console.error('❌ Failed to check contract deployment:', error);
    return {
      success: false,
      error: (error as Error).message || 'Failed to check contract deployment'
    };
  }
}

/**
 * Register a route with the smart contract before execution
 */
export async function registerRouteWithContract(
  route: RouteQuote,
  userAddress: string
): Promise<string> {
  try {
    console.log('📝 Registering route with smart contract...');
    console.log(`   Route ID: ${route.routeId}`);
    console.log(`   Expected Receive: ${route.grossSend * route.effectiveRate}`);
    console.log(`   User: ${userAddress}`);

    // Calculate expected receive amount in stroops
    const expectedReceive = Math.floor(route.grossSend * route.effectiveRate * 10000000);

    // Make real contract call
    const response = await fetch('/api/contract/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'register_route',
        params: [
          route.routeId,
          expectedReceive,
          userAddress
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Contract invocation failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Contract registration failed');
    }

    const attestationHash = `attestation_${route.routeId}_${Date.now()}`;
    
    console.log(`   ✅ Route registered with attestation hash: ${attestationHash}`);
    console.log(`   📊 Contract result:`, result.result);
    
    return attestationHash;
  } catch (error) {
    console.error('❌ Failed to register route with contract:', error);
    throw error;
  }
}

/**
 * Finalize a route with the smart contract after execution
 */
export async function finalizeRouteWithContract(
  attestationHash: string,
  actualReceive: number,
  txHash: string
): Promise<number> {
  try {
    console.log('✅ Finalizing route attestation...');
    console.log(`   Attestation Hash: ${attestationHash}`);
    console.log(`   Actual Receive: ${actualReceive}`);
    console.log(`   Transaction Hash: ${txHash}`);

    // Extract route ID from attestation hash
    const routeId = attestationHash.split('_')[1];
    
    // Convert actual receive amount to stroops
    const actualReceiveStroops = Math.floor(actualReceive * 10000000);
    
    // Convert transaction hash to BytesN format
    const txHashBytes = txHash; // Soroban CLI will handle the conversion
    
    // Make real contract call
    const response = await fetch('/api/contract/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'finalize_route',
        params: [
          routeId,
          { type: 'bytes32', value: txHashBytes },
          actualReceiveStroops
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Contract invocation failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Contract finalization failed');
    }

    // Parse variance from result (should be a number in stroops)
    const variance = parseInt(result.result) || 0;
    
    console.log(`   ✅ Route finalized with variance: ${variance} stroops`);
    console.log(`   📊 Contract result:`, result.result);
    
    return variance;
  } catch (error) {
    console.error('❌ Failed to finalize route with contract:', error);
    throw error;
  }
}

/**
 * Query route data from the smart contract
 */
export async function getRouteFromContract(routeId: string): Promise<ContractRouteData | null> {
  try {
    console.log(`🔍 Querying route data for: ${routeId}`);

    // Make real contract call
    const response = await fetch('/api/contract/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'get_route',
        params: [routeId]
      })
    });

    if (!response.ok) {
      throw new Error(`Contract query failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      console.warn('Route not found in contract:', result.error);
      return null;
    }

    // Parse the contract response
    // The result should be a JSON string containing the route data
    const routeData = JSON.parse(result.result);
    
    console.log(`   ✅ Route data retrieved:`, routeData);
    
    return routeData;
  } catch (error) {
    console.error('❌ Failed to query route from contract:', error);
    return null;
  }
}

/**
 * Get contract explorer URL
 */
export function getContractExplorerUrl(): string {
  // This will be set by the deployment API
  const contractId = process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID;
  if (!contractId) {
    return '#';
  }
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

/**
 * Check if contract is deployed
 */
export function isContractDeployed(): boolean {
  return !!process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID;
}
