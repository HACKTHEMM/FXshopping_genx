/**
 * Route type definitions for StellarFX Shopper
 * Defines the data structures for route discovery, comparison, and execution
 */

export type RouteLegType =
  | 'offchain-quote'      // External FX provider quote
  | 'onchain-path'        // Stellar path payment hop
  | 'stellar-path'        // Stellar DEX path payment
  | 'amm-hop'             // Liquidity pool swap
  | 'anchor-deposit'      // Simulated fiat → token deposit
  | 'anchor-withdraw'     // Simulated token → fiat withdrawal
  | 'contract-attestation'; // Soroban contract call

export interface RouteFee {
  kind: string;           // e.g., 'network', 'spread', 'anchor_withdrawal', 'provider_fee'
  amount: number;         // Fee amount in the specified asset
  asset: string;          // Asset code (e.g., 'XLM', 'USD', 'USDC')
  note?: string;          // Optional explanation
}

export interface RouteLeg {
  type: RouteLegType;
  from: string;           // Asset code or contextual label (e.g., 'INRTEST', 'XLM', 'Bank INR')
  to: string;             // Asset code or contextual label
  rate: number;           // Effective rate: how many 'to' units per 'from' unit
  estSeconds: number;     // Estimated time for this leg
  fees: RouteFee[];       // Fees specific to this leg
  provider?: string;      // Provider name if applicable (e.g., 'MoneyGram', 'Horizon Path')
  liquidityDepth?: number; // Optional: available liquidity (for risk scoring)
}

export interface StellarAsset {
  code: string;           // Asset code (e.g., 'USDC', 'INRTEST')
  issuer?: string;        // Issuer public key (undefined for native XLM)
  type?: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
}

export interface RouteExecution {
  canBuildXDR: boolean;                     // Whether we can build a transaction XDR
  contractAttestationSupported: boolean;    // Whether Soroban attestation is available
  requiresKYC: boolean;                     // Whether KYC is needed for this route
  estimatedConfirmationTime: number;        // Expected confirmation time in seconds
}

export interface RouteQuote {
  routeId: string;                  // Unique identifier for this route
  sendAsset: StellarAsset;          // Source asset on Stellar
  destAsset: StellarAsset;          // Destination asset on Stellar
  sourceFiat?: string;              // Original fiat currency (e.g., 'INR')
  destinationFiat?: string;         // Target fiat currency (e.g., 'USD')
  grossSend: number;                // User-input nominal send amount
  legs: RouteLeg[];                 // Ordered array of route legs
  totalFees: number;                // Sum of all fees in destination asset units
  netReceive: number;               // Amount received after all fees & slippage
  effectiveRate: number;            // netReceive / grossSend (overall conversion rate)
  riskScore: number;                // 0 (low risk) to 1 (high risk)
  slippagePct: number;              // Slippage buffer applied (percentage)
  execution: RouteExecution;        // Execution capabilities
  references?: {
    pathPaymentXDR?: string;        // Pre-built unsigned transaction XDR
    contractRouteHash?: string;     // Hash for contract attestation
    horizonPathId?: string;         // Horizon path payment endpoint reference
  };
  providerName?: string;            // Primary provider name (for UI display)
  savingsVsBaseline?: number;       // Savings compared to worst route (in dest currency)
  createdAt: Date;                  // Timestamp of quote generation
}

export interface RouteComparisonRequest {
  sourceAsset: StellarAsset;
  destAsset: StellarAsset;
  sendAmount: number;
  senderAddress?: string;           // Optional: for path payment discovery
  destinationAddress?: string;      // Optional: recipient address
  sourceFiat?: string;              // Optional: original fiat
  destFiat?: string;                // Optional: target fiat
}

export interface RouteComparisonResponse {
  routes: RouteQuote[];             // Sorted by best netReceive (descending)
  bestRoute?: RouteQuote;           // Convenience reference to top route
  worstRoute?: RouteQuote;          // Baseline for savings calculation
  averageEffectiveRate: number;     // Average rate across all routes
  requestId: string;                // For tracking & caching
  timestamp: Date;
}

// Mock provider quote (for off-chain FX providers)
export interface ProviderQuote {
  providerId: string;
  providerName: string;
  sourceCurrency: string;
  destCurrency: string;
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: RouteFee[];
  estimatedTime: number;            // Seconds
  expiresAt: Date;
}

// Stellar path payment result from Horizon
export interface HorizonPathResult {
  source_asset_type: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
  source_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  destination_amount: string;
  path: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
  }>;
}

// Transaction submission result
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  ledger?: number;
  error?: string;
  explorerUrl?: string;
}

// Contract attestation data
export interface RouteAttestation {
  routeId: string;
  routeHash: string;
  expectedNet: number;
  actualNet?: number;
  txHash?: string;
  contractId?: string;
  status: 'registered' | 'finalized' | 'failed';
  variance?: number;                // Difference between expected and actual
  createdAt: Date;
  finalizedAt?: Date;
}
