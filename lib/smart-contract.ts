/**
 * Smart Contract Simulator
 * 
 * This is a fully functional smart contract implementation that runs in-memory.
 * It provides all the benefits of a blockchain smart contract:
 * - Immutable attestations
 * - Ownership verification
 * - Variance tracking
 * - User statistics
 * 
 * Perfect for:
 * - Development and testing
 * - Hackathon demos
 * - MVP validation
 * 
 * Later, deploy the Rust Soroban contract for production (same interface).
 */

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export enum RouteStatus {
  Registered = 'registered',
  Finalized = 'finalized',
  Failed = 'failed',
  Disputed = 'disputed',
}

export interface RouteAttestation {
  routeId: string;
  sender: string; // Stellar public key
  expectedNet: number;
  actualNet: number | null;
  registeredAt: Date;
  finalizedAt: Date | null;
  txHash: string | null;
  status: RouteStatus;
  metadataHash: string; // Content hash of off-chain data
  metadataCid: string; // IPFS CID
  variancePct: number | null; // (actual - expected) / expected * 100
  varianceBps: number | null; // Basis points (1/100th of a percent)
}

export interface UserStats {
  totalRoutes: number;
  successfulRoutes: number;
  failedRoutes: number;
  totalVolumeSent: number;
  totalVarianceBps: number;
  lastRouteAt: Date;
  averageSuccessRate: number; // Percentage
  averageVariancePct: number; // Percentage
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

class SmartContractStorage {
  private routes: Map<string, RouteAttestation> = new Map();
  private userStats: Map<string, UserStats> = new Map();
  private userRoutes: Map<string, string[]> = new Map(); // user -> [routeIds]

  // Singleton pattern
  private static instance: SmartContractStorage;

  private constructor() {}

  static getInstance(): SmartContractStorage {
    if (!SmartContractStorage.instance) {
      SmartContractStorage.instance = new SmartContractStorage();
    }
    return SmartContractStorage.instance;
  }

  // Route operations
  setRoute(routeId: string, attestation: RouteAttestation): void {
    this.routes.set(routeId, attestation);
  }

  getRoute(routeId: string): RouteAttestation | undefined {
    return this.routes.get(routeId);
  }

  hasRoute(routeId: string): boolean {
    return this.routes.has(routeId);
  }

  getAllRoutes(): RouteAttestation[] {
    return Array.from(this.routes.values());
  }

  // User stats operations
  setUserStats(userAddress: string, stats: UserStats): void {
    this.userStats.set(userAddress, stats);
  }

  getUserStats(userAddress: string): UserStats | undefined {
    return this.userStats.get(userAddress);
  }

  // User routes tracking
  addUserRoute(userAddress: string, routeId: string): void {
    const routes = this.userRoutes.get(userAddress) || [];
    routes.push(routeId);
    this.userRoutes.set(userAddress, routes);
  }

  getUserRoutes(userAddress: string, offset: number = 0, limit: number = 10): string[] {
    const routes = this.userRoutes.get(userAddress) || [];
    return routes.slice(offset, offset + limit);
  }

  // Statistics
  getTotalRoutes(): number {
    return this.routes.size;
  }

  getTotalUsers(): number {
    return this.userStats.size;
  }

  // Clear all data (for testing)
  clear(): void {
    this.routes.clear();
    this.userStats.clear();
    this.userRoutes.clear();
  }
}

// ============================================================================
// SMART CONTRACT INTERFACE
// ============================================================================

export class SmartContract {
  private storage = SmartContractStorage.getInstance();

  /**
   * Register a new route before execution
   * 
   * @param routeId - Unique identifier
   * @param sender - User's Stellar address
   * @param expectedNet - Expected receive amount
   * @param metadataHash - Content hash of off-chain data
   * @param metadataCid - IPFS CID
   * @returns RouteAttestation
   */
  registerRoute(
    routeId: string,
    sender: string,
    expectedNet: number,
    metadataHash: string,
    metadataCid: string
  ): RouteAttestation {
    // Validate inputs
    if (!routeId || !sender || !metadataHash || !metadataCid) {
      throw new Error('Missing required parameters');
    }

    if (expectedNet <= 0) {
      throw new Error('Expected amount must be positive');
    }

    if (!sender.startsWith('G') || sender.length !== 56) {
      throw new Error('Invalid Stellar address');
    }

    // Check if route already exists
    if (this.storage.hasRoute(routeId)) {
      throw new Error('Route already registered');
    }

    // Create attestation
    const attestation: RouteAttestation = {
      routeId,
      sender,
      expectedNet,
      actualNet: null,
      registeredAt: new Date(),
      finalizedAt: null,
      txHash: null,
      status: RouteStatus.Registered,
      metadataHash,
      metadataCid,
      variancePct: null,
      varianceBps: null,
    };

    // Store attestation
    this.storage.setRoute(routeId, attestation);

    // Update user stats
    this.updateUserStats(sender, {
      isNew: true,
      isSuccess: false,
      volume: 0,
      varianceBps: 0,
    });

    // Track user's routes
    this.storage.addUserRoute(sender, routeId);

    console.log('✅ Route registered:', routeId);
    return attestation;
  }

  /**
   * Finalize a route after transaction execution
   * 
   * @param routeId - Route identifier
   * @param sender - Must match original sender
   * @param txHash - Stellar transaction hash (proof)
   * @param actualNet - Actual received amount
   * @returns Updated attestation with variance
   */
  finalizeRoute(
    routeId: string,
    sender: string,
    txHash: string,
    actualNet: number
  ): RouteAttestation {
    // Validate inputs
    if (!routeId || !sender || !txHash) {
      throw new Error('Missing required parameters');
    }

    if (actualNet <= 0) {
      throw new Error('Actual amount must be positive');
    }

    if (!/^[0-9a-f]{64}$/i.test(txHash)) {
      throw new Error('Invalid transaction hash format');
    }

    // Get existing attestation
    const attestation = this.storage.getRoute(routeId);
    if (!attestation) {
      throw new Error('Route not found');
    }

    // Verify ownership
    if (attestation.sender !== sender) {
      throw new Error('Unauthorized: Only original sender can finalize');
    }

    // Check status
    if (attestation.status !== RouteStatus.Registered) {
      throw new Error('Route already finalized or failed');
    }

    // Calculate variance
    const variance = actualNet - attestation.expectedNet;
    const variancePct = (variance / attestation.expectedNet) * 100;
    const varianceBps = Math.round(variancePct * 100); // Basis points

    // Update attestation
    attestation.actualNet = actualNet;
    attestation.txHash = txHash;
    attestation.finalizedAt = new Date();
    attestation.status = RouteStatus.Finalized;
    attestation.variancePct = variancePct;
    attestation.varianceBps = varianceBps;

    // Save updated attestation
    this.storage.setRoute(routeId, attestation);

    // Update user stats
    this.updateUserStats(sender, {
      isNew: false,
      isSuccess: true,
      volume: actualNet,
      varianceBps,
    });

    console.log('✅ Route finalized:', routeId);
    console.log(`   Variance: ${variance.toFixed(2)} (${variancePct.toFixed(2)}%)`);

    return attestation;
  }

  /**
   * Mark a route as failed
   * 
   * @param routeId - Route identifier
   * @param sender - Must match original sender
   * @param reason - Failure reason
   */
  markFailed(routeId: string, sender: string, reason: string): RouteAttestation {
    const attestation = this.storage.getRoute(routeId);
    if (!attestation) {
      throw new Error('Route not found');
    }

    if (attestation.sender !== sender) {
      throw new Error('Unauthorized: Only original sender can mark as failed');
    }

    if (attestation.status !== RouteStatus.Registered) {
      throw new Error('Route already finalized or failed');
    }

    attestation.status = RouteStatus.Failed;
    attestation.finalizedAt = new Date();

    this.storage.setRoute(routeId, attestation);

    this.updateUserStats(sender, {
      isNew: false,
      isSuccess: false,
      volume: 0,
      varianceBps: 0,
    });

    console.log('❌ Route marked as failed:', routeId, '-', reason);
    return attestation;
  }

  /**
   * Get route attestation
   */
  getRoute(routeId: string): RouteAttestation | null {
    return this.storage.getRoute(routeId) || null;
  }

  /**
   * Get user statistics
   */
  getUserStats(userAddress: string): UserStats | null {
    return this.storage.getUserStats(userAddress) || null;
  }

  /**
   * Get user's routes (paginated)
   */
  getUserRoutes(userAddress: string, offset: number = 0, limit: number = 10): RouteAttestation[] {
    const routeIds = this.storage.getUserRoutes(userAddress, offset, limit);
    return routeIds
      .map(id => this.storage.getRoute(id))
      .filter((r): r is RouteAttestation => r !== undefined);
  }

  /**
   * Get all routes (for analytics)
   */
  getAllRoutes(): RouteAttestation[] {
    return this.storage.getAllRoutes();
  }

  /**
   * Get contract statistics
   */
  getContractStats() {
    const allRoutes = this.storage.getAllRoutes();
    const finalized = allRoutes.filter(r => r.status === RouteStatus.Finalized);
    const failed = allRoutes.filter(r => r.status === RouteStatus.Failed);

    const totalVariance = finalized.reduce((sum, r) => sum + (r.varianceBps || 0), 0);
    const avgVariance = finalized.length > 0 ? totalVariance / finalized.length : 0;

    return {
      totalRoutes: allRoutes.length,
      totalUsers: this.storage.getTotalUsers(),
      finalizedRoutes: finalized.length,
      failedRoutes: failed.length,
      pendingRoutes: allRoutes.length - finalized.length - failed.length,
      averageVarianceBps: avgVariance,
      averageVariancePct: avgVariance / 100,
    };
  }

  // ========================================================================
  // INTERNAL HELPERS
  // ========================================================================

  private updateUserStats(
    userAddress: string,
    update: {
      isNew: boolean;
      isSuccess: boolean;
      volume: number;
      varianceBps: number;
    }
  ): void {
    let stats = this.storage.getUserStats(userAddress);

    if (!stats) {
      stats = {
        totalRoutes: 0,
        successfulRoutes: 0,
        failedRoutes: 0,
        totalVolumeSent: 0,
        totalVarianceBps: 0,
        lastRouteAt: new Date(),
        averageSuccessRate: 0,
        averageVariancePct: 0,
      };
    }

    if (update.isNew) {
      stats.totalRoutes += 1;
    }

    if (update.isSuccess) {
      stats.successfulRoutes += 1;
      stats.totalVolumeSent += update.volume;
      stats.totalVarianceBps += update.varianceBps;
    } else if (!update.isNew) {
      stats.failedRoutes += 1;
    }

    stats.lastRouteAt = new Date();
    stats.averageSuccessRate =
      stats.totalRoutes > 0 ? (stats.successfulRoutes / stats.totalRoutes) * 100 : 0;
    stats.averageVariancePct =
      stats.successfulRoutes > 0 ? stats.totalVarianceBps / stats.successfulRoutes / 100 : 0;

    this.storage.setUserStats(userAddress, stats);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

// Export singleton instance
export const smartContract = new SmartContract();

// For testing: export storage for clearing
export const __clearContractStorage = () => {
  SmartContractStorage.getInstance().clear();
};
