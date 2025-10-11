/**
 * TypeScript types for Wormhole integration
 * 
 * This file contains all the type definitions needed for
 * Wormhole token bridging and Generic Message Passing operations.
 */

// Supported chains in our system
export type SupportedChain = 'stellar' | 'solana' | 'ethereum';

// Token symbols we support
export type SupportedToken = 'USDC' | 'USDT' | 'XLM';

// Bridge operation types
export interface BridgeRequest {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  token: SupportedToken;
  amount: string; // Amount as string to handle large numbers
  recipientAddress: string;
  relayerFee?: string; // Optional relayer fee
  payload?: string; // Optional payload for programmatic transfers
}

export interface BridgeResponse {
  success: boolean;
  txHash?: string;
  vaa?: string;
  sequence?: string;
  error?: string;
  estimatedTime?: number; // Estimated completion time in seconds
}

// Message passing types
export interface MessageRequest {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  messagePayload: string;
  gasLimit?: string; // Optional gas limit
  nativeGas?: string; // Optional native gas
}

export interface MessageResponse {
  success: boolean;
  txHash?: string;
  vaa?: string;
  sequence?: string;
  error?: string;
  estimatedTime?: number;
}

// VAA (Verifiable Action Approval) types
export interface VAA {
  version: number;
  guardianSetIndex: number;
  signatures: Signature[];
  timestamp: number;
  nonce: number;
  emitterChain: number;
  emitterAddress: string;
  sequence: string;
  consistencyLevel: number;
  payload: Buffer;
}

export interface Signature {
  guardianIndex: number;
  signature: string;
}

// Chain-specific configuration
export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  coreContract: string;
  tokenBridgeContract: string;
  relayerContract?: string;
}

export interface WormholeConfig {
  network: 'testnet' | 'mainnet';
  chains: Record<SupportedChain, ChainConfig>;
  guardianRpcUrls: string[];
}

// Token bridge specific types
export interface TokenBridgeTransfer {
  tokenId: {
    chain: SupportedChain;
    address: string;
  };
  amount: string;
  recipientChain: SupportedChain;
  recipientAddress: string;
  relayerFee?: string;
  payload?: Buffer;
}

export interface TokenBridgeAttestation {
  tokenId: {
    chain: SupportedChain;
    address: string;
  };
  decimals: number;
  symbol: string;
  name: string;
}

// Generic Message Passing types
export interface GMPMessage {
  targetChain: SupportedChain;
  payload: Buffer;
  gasLimit?: string;
  nativeGas?: string;
}

export interface GMPResponse {
  messageId: string;
  vaa: string;
  sequence: string;
}

// Error types
export interface WormholeError {
  code: string;
  message: string;
  details?: any;
}

// Event types for listening to Wormhole events
export interface WormholeEvent {
  type: 'Transfer' | 'Message' | 'Attestation';
  chain: SupportedChain;
  txHash: string;
  sequence: string;
  vaa?: string;
  timestamp: number;
}

// API request/response types for Next.js routes
export interface BridgeApiRequest {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  token: SupportedToken;
  amount: string;
  recipientAddress: string;
  relayerFee?: string;
  payload?: string;
}

export interface MessageApiRequest {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  messagePayload: string;
  gasLimit?: string;
  nativeGas?: string;
}

// Soroban integration types
export interface SorobanAttestation {
  routeId: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string;
  timestamp: number;
  sourceChain: SupportedChain;
  targetChain: SupportedChain;
  vaa: string;
}

export interface SorobanBridgeData {
  tokenAddress: string;
  amount: string;
  recipientAddress: string;
  vaa: string;
  attestationData?: SorobanAttestation;
}

// Utility types
export type ChainName = 'stellar' | 'solana' | 'ethereum';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chain: SupportedChain;
}

// Mock data types for testing
export interface MockTokenData {
  stellar: Record<SupportedToken, string>;
  solana: Record<SupportedToken, string>;
  ethereum: Record<SupportedToken, string>;
}

// Configuration for different environments
export interface EnvironmentConfig {
  isTestnet: boolean;
  wormholeRpcUrl: string;
  guardianRpcUrls: string[];
  mockTokens: MockTokenData;
  contractAddresses: Record<SupportedChain, {
    core: string;
    tokenBridge: string;
    relayer?: string;
  }>;
}

// Response types for API endpoints
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// WebSocket event types for real-time updates
export interface WebSocketEvent {
  type: 'vaa_received' | 'bridge_completed' | 'message_sent' | 'error';
  data: any;
  timestamp: number;
}

// Rate limiting and retry types
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
}
