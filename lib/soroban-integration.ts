/**
 * Soroban Smart Contract Integration
 * 
 * Implements the "single program with per-user state" pattern
 * Integrates with the RouteRegistry contract for transaction attestation
 * 
 * Architecture Benefits:
 * - ✅ Single contract deployment (low cost)
 * - ✅ Per-user state isolation (privacy + efficiency)
 * - ✅ Hybrid storage (critical data on-chain, metadata off-chain)
 * - ✅ Cryptographic verification (content hashes)
 * 
 * NOTE: Uses in-memory smart contract for development/demo.
 * Deploy the Rust Soroban contract for production (same interface).
 */

import { storeMetadata, RouteMetadata } from './offchain-storage';
import { RouteQuote } from './types/route';
import { smartContract, RouteAttestation, UserStats } from './smart-contract';

/**
 * Generate a unique route ID
 * Hash of: sender + route params + timestamp
 */
export async function generateRouteId(
  senderAddress: string,
  route: RouteQuote,
  timestamp: number = Date.now()
): Promise<string> {
  const data = `${senderAddress}:${route.sendAsset.code}:${route.destAsset.code}:${route.grossSend}:${timestamp}`;
  return await hashString(data);
}

/**
 * Hash a string to 32 bytes (for Soroban BytesN<32>)
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Register a route on-chain before execution
 * 
 * Flow:
 * 1. Store full route metadata off-chain (IPFS/mock)
 * 2. Generate content hash for verification
 * 3. Register route in smart contract with hash
 * 
 * Returns: Route ID, IPFS CID, and attestation data
 */
export async function registerRoute(
  userPublicKey: string,
  route: RouteQuote,
  metadata: RouteMetadata
): Promise<{
  routeId: string;
  ipfsCid: string;
  contentHash: string;
  attestation: RouteAttestation;
}> {
  try {
    console.log('📝 Registering route with smart contract...');

    // Step 1: Store metadata off-chain
    const { cid, contentHash } = await storeMetadata(metadata, 'mock');
    console.log('✅ Metadata stored:', cid);
    console.log('🔐 Content hash:', contentHash);

    // Step 2: Generate unique route ID
    const routeId = await generateRouteId(userPublicKey, route);
    console.log('🆔 Route ID:', routeId);

    // Step 3: Register in smart contract
    const attestation = smartContract.registerRoute(
      routeId,
      userPublicKey,
      route.netReceive,
      contentHash,
      cid
    );

    console.log('✅ Route registered in smart contract');
    console.log('   Expected receive:', route.netReceive, route.destAsset.code);

    return {
      routeId,
      ipfsCid: cid,
      contentHash,
      attestation,
    };
  } catch (error) {
    console.error('❌ Failed to register route:', error);
    throw error;
  }
}

/**
 * Finalize a route after transaction execution
 * 
 * Updates smart contract attestation with:
 * - Stellar transaction hash (proof)
 * - Actual received amount
 * - Variance calculation (automatic)
 */
export async function finalizeRoute(
  userPublicKey: string,
  routeId: string,
  stellarTxHash: string,
  actualReceived: number
): Promise<{
  variance: number;
  variancePct: number;
  varianceBps: number;
  attestation: RouteAttestation;
}> {
  try {
    console.log('✅ Finalizing route with smart contract...');
    console.log('   Route ID:', routeId);
    console.log('   TX Hash:', stellarTxHash);
    console.log('   Actual Received:', actualReceived);

    // Finalize in smart contract
    const attestation = smartContract.finalizeRoute(
      routeId,
      userPublicKey,
      stellarTxHash,
      actualReceived
    );

    const variance = actualReceived - (attestation.expectedNet || 0);
    const variancePct = attestation.variancePct || 0;
    const varianceBps = attestation.varianceBps || 0;

    console.log('✅ Route finalized in smart contract');
    console.log(`   Variance: ${variance.toFixed(2)} (${variancePct.toFixed(2)}%)`);
    console.log(`   Variance (bps): ${varianceBps}`);

    return {
      variance,
      variancePct,
      varianceBps,
      attestation,
    };
  } catch (error) {
    console.error('❌ Failed to finalize route:', error);
    throw error;
  }
}

/**
 * Query route attestation from smart contract
 */
export async function getRouteAttestation(routeId: string): Promise<RouteAttestation | null> {
  console.log('📊 Querying route attestation:', routeId);
  const attestation = smartContract.getRoute(routeId);
  
  if (attestation) {
    console.log('✅ Route found:', attestation.status);
  } else {
    console.log('⚠️ Route not found');
  }
  
  return attestation;
}

/**
 * Query user statistics from smart contract
 */
export async function getUserStatsData(userAddress: string): Promise<UserStats | null> {
  console.log('📊 Querying user stats:', userAddress);
  const stats = smartContract.getUserStats(userAddress);
  
  if (stats) {
    console.log('✅ User stats found');
    console.log(`   Total routes: ${stats.totalRoutes}`);
    console.log(`   Success rate: ${stats.averageSuccessRate.toFixed(2)}%`);
  } else {
    console.log('⚠️ No stats found for user');
  }
  
  return stats;
}

/**
 * Get user's route history
 */
export async function getUserRouteHistory(
  userAddress: string,
  offset: number = 0,
  limit: number = 10
): Promise<RouteAttestation[]> {
  console.log('📊 Querying user route history:', userAddress);
  return smartContract.getUserRoutes(userAddress, offset, limit);
}

/**
 * Get contract-wide statistics
 */
export async function getContractStats() {
  console.log('📊 Querying contract statistics');
  return smartContract.getContractStats();
}

/**
 * Helper: Convert stroops (1e7) to decimal
 */
export function stroopsToDecimal(stroops: number): number {
  return stroops / 1e7;
}

/**
 * Helper: Convert decimal to stroops
 */
export function decimalToStroops(decimal: number): number {
  return Math.floor(decimal * 1e7);
}
