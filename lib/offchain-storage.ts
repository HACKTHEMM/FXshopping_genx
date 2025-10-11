/**
 * Off-Chain Storage Service
 * 
 * Implements the hybrid storage pattern:
 * - Critical data (hashes, amounts, ownership) → On-chain (Soroban)
 * - Large metadata (route details, quotes) → Off-chain (IPFS/Arweave)
 * - Content hashes stored on-chain for verification
 * 
 * Benefits:
 * - ✅ Lower gas costs (only hash stored on-chain)
 * - ✅ Scalable storage (no blockchain bloat)
 * - ✅ Verifiable integrity (content-addressed storage)
 * - ✅ Censorship-resistant (IPFS/Arweave)
 */

import { create } from 'ipfs-http-client';
import { RouteQuote } from './types/route';

// IPFS Configuration
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io';
const IPFS_API = process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001';

// Fallback: use public gateway if no custom API
let ipfsClient: ReturnType<typeof create> | null = null;

try {
  ipfsClient = create({ url: IPFS_API });
} catch (error) {
  console.warn('⚠️ IPFS client not initialized. Using mock storage.', error);
}

/**
 * Route metadata stored off-chain
 * This is the full data structure; only its hash goes on-chain
 */
export interface RouteMetadata {
  routeQuote: RouteQuote;
  userContext: {
    senderAddress: string;
    destinationAddress?: string;
    userAgent?: string;
    ipAddress?: string; // Hashed for privacy
    timestamp: string;
  };
  compliance: {
    kycStatus?: 'verified' | 'pending' | 'not_required';
    jurisdiction?: string;
    sanctions_check_passed?: boolean;
  };
  execution: {
    quoteExpiresAt: string;
    maxSlippagePct: number;
    preferredSpeed: 'instant' | 'fast' | 'economy';
  };
  providerData?: {
    providerQuotes: Array<{
      provider: string;
      rawQuote: unknown;
      timestamp: string;
    }>;
  };
  version: string; // Schema version for future compatibility
}

/**
 * Store route metadata on IPFS
 * Returns content hash (CID) to store on-chain
 */
export async function storeRouteMetadata(
  metadata: RouteMetadata
): Promise<string> {
  if (!ipfsClient) {
    // Mock mode for development without IPFS
    console.warn('📦 Mock IPFS: storing metadata in memory');
    const mockCid = generateMockCID(metadata);
    mockStorage.set(mockCid, metadata);
    return mockCid;
  }

  try {
    const data = JSON.stringify(metadata, null, 2);
    const result = await ipfsClient.add(data, {
      pin: true, // Pin to prevent garbage collection
    });

    console.log('✅ Stored route metadata on IPFS:', result.path);
    return result.path; // CID (content identifier)
  } catch (error) {
    console.error('❌ Failed to store on IPFS:', error);
    throw new Error('IPFS storage failed');
  }
}

/**
 * Retrieve route metadata from IPFS
 */
export async function retrieveRouteMetadata(
  cid: string
): Promise<RouteMetadata | null> {
  // Check mock storage first
  if (mockStorage.has(cid)) {
    return mockStorage.get(cid)!;
  }

  if (!ipfsClient) {
    console.warn('⚠️ IPFS client not available');
    return null;
  }

  try {
    // Fetch from IPFS gateway
    const response = await fetch(`${IPFS_GATEWAY}/ipfs/${cid}`);
    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.statusText}`);
    }

    const metadata: RouteMetadata = await response.json();
    return metadata;
  } catch (error) {
    console.error('❌ Failed to retrieve from IPFS:', error);
    return null;
  }
}

/**
 * Generate content hash for verification
 * This hash is stored on-chain to prove off-chain data integrity
 */
export async function generateContentHash(metadata: RouteMetadata): Promise<string> {
  const data = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Use Web Crypto API for SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Verify off-chain data integrity
 * Compares computed hash with on-chain stored hash
 */
export async function verifyMetadataIntegrity(
  metadata: RouteMetadata,
  expectedHash: string
): Promise<boolean> {
  const computedHash = await generateContentHash(metadata);
  return computedHash === expectedHash;
}

// ============================================================================
// MOCK STORAGE (Development Mode)
// ============================================================================

const mockStorage = new Map<string, RouteMetadata>();

function generateMockCID(data: RouteMetadata): string {
  const timestamp = new Date().getTime();
  const random = Math.random().toString(36).substring(2, 15);
  const routeId = data.routeQuote.routeId.substring(0, 8);
  return `Qm${routeId}${random}${timestamp}`.substring(0, 46);
}

// ============================================================================
// ARWEAVE ALTERNATIVE (Permanent Storage)
// ============================================================================

/**
 * For truly permanent storage, use Arweave instead of IPFS
 * Arweave provides one-time payment for permanent storage
 * 
 * Usage:
 * ```typescript
 * import Arweave from 'arweave';
 * 
 * const arweave = Arweave.init({
 *   host: 'arweave.net',
 *   port: 443,
 *   protocol: 'https'
 * });
 * 
 * const tx = await arweave.createTransaction({ data: JSON.stringify(metadata) });
 * await arweave.transactions.sign(tx, wallet);
 * await arweave.transactions.post(tx);
 * return tx.id; // Transaction ID (permanent address)
 * ```
 */

export interface ArweaveConfig {
  enabled: boolean;
  apiUrl: string;
  walletJWK?: unknown; // Arweave wallet JSON
}

export async function storeOnArweave(
  metadata: RouteMetadata,
  config: ArweaveConfig
): Promise<string> {
  if (!config.enabled) {
    throw new Error('Arweave storage not enabled');
  }

  // TODO: Implement Arweave upload
  // This is a placeholder for permanent storage option
  console.log('📝 Arweave storage not yet implemented');
  return 'ar-mock-tx-id';
}

// ============================================================================
// STORAGE STRATEGY SELECTOR
// ============================================================================

export type StorageProvider = 'ipfs' | 'arweave' | 'mock';

export async function storeMetadata(
  metadata: RouteMetadata,
  provider: StorageProvider = 'ipfs'
): Promise<{ cid: string; contentHash: string }> {
  let cid: string;

  switch (provider) {
    case 'ipfs':
      cid = await storeRouteMetadata(metadata);
      break;
    case 'arweave':
      cid = await storeOnArweave(metadata, {
        enabled: false,
        apiUrl: 'https://arweave.net',
      });
      break;
    case 'mock':
      cid = generateMockCID(metadata);
      mockStorage.set(cid, metadata);
      break;
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }

  const contentHash = await generateContentHash(metadata);

  return { cid, contentHash };
}
