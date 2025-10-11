/**
 * Wormhole integration types for cross-chain asset bridging
 * Supports bridging ETH, USD stablecoins, and other assets across chains
 */

export type WormholeChainId = 
  | 'ethereum'      // Ethereum mainnet
  | 'solana'        // Solana mainnet
  | 'polygon'       // Polygon
  | 'avalanche'     // Avalanche C-Chain
  | 'bsc'          // Binance Smart Chain
  | 'arbitrum'     // Arbitrum One
  | 'optimism'     // Optimism
  | 'base'         // Base
  | 'stellar';      // Stellar (custom integration)

export type WormholeAssetType = 
  | 'native'        // Native token (ETH, SOL, etc.)
  | 'wrapped'       // Wrapped token (WETH, WSOL, etc.)
  | 'stablecoin'    // USD stablecoins (USDC, USDT, DAI)
  | 'erc20'         // ERC-20 tokens
  | 'spl'           // SPL tokens on Solana
  | 'stellar-asset'; // Stellar issued assets

export interface WormholeAsset {
  chainId: WormholeChainId;
  address: string;           // Contract address or asset identifier
  symbol: string;           // Asset symbol (ETH, USDC, etc.)
  decimals: number;         // Token decimals
  type: WormholeAssetType;
  wrappedAddress?: string;  // Address of wrapped version on destination chain
  logoUrl?: string;         // Asset logo URL
}

export interface WormholeRoute {
  routeId: string;
  sourceAsset: WormholeAsset;
  destAsset: WormholeAsset;
  sourceChain: WormholeChainId;
  destChain: WormholeChainId;
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: {
    wormholeFee: number;      // Wormhole protocol fee
    gasFee: number;          // Gas fee for source chain
    relayFee?: number;       // Optional relay fee
    totalFees: number;
  };
  estimatedTime: number;     // Estimated completion time in seconds
  steps: WormholeStep[];
  riskScore: number;         // Risk score 0-1
  isWrapped: boolean;        // Whether destination asset is wrapped
  contractAddresses: {
    sourceBridge?: string;
    destBridge?: string;
    tokenBridge?: string;
  };
}

export interface WormholeStep {
  stepId: string;
  chainId: WormholeChainId;
  action: 'lock' | 'burn' | 'mint' | 'unlock' | 'transfer';
  asset: WormholeAsset;
  amount: number;
  estimatedTime: number;
  gasRequired?: number;
  contractAddress: string;
  description: string;
}

export interface WormholeTransferRequest {
  sourceChain: WormholeChainId;
  destChain: WormholeChainId;
  sourceAsset: WormholeAsset;
  destAsset: WormholeAsset;
  amount: number;
  recipientAddress: string;
  senderAddress?: string;
  relayerFee?: number;
}

export interface WormholeTransferResult {
  success: boolean;
  transactionHash?: string;
  wormholeSequence?: string;
  vaaHash?: string;          // VAA (Verifiable Action Approval) hash
  error?: string;
  explorerUrls: {
    source?: string;
    destination?: string;
    wormhole?: string;
  };
  estimatedCompletionTime?: Date;
}

export interface WormholeQuote {
  routeId: string;
  sourceAsset: WormholeAsset;
  destAsset: WormholeAsset;
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: WormholeRoute['fees'];
  estimatedTime: number;
  isWrapped: boolean;
  liquidityDepth?: number;
  providerName: string;
  expiresAt: Date;
}

export interface WormholeConfig {
  chains: {
    [key in WormholeChainId]: {
      chainId: number;
      rpcUrl: string;
      explorerUrl: string;
      bridgeAddress: string;
      tokenBridgeAddress: string;
      gasToken: string;
      blockTime: number;
      // Stellar-specific properties
      networkPassphrase?: string;
      isTestnet?: boolean;
    };
  };
  supportedAssets: WormholeAsset[];
  defaultGasLimit: number;
  maxSlippage: number;
}

export interface WormholeEvent {
  type: 'transfer_initiated' | 'vaa_emitted' | 'transfer_completed' | 'transfer_failed';
  chainId: WormholeChainId;
  transactionHash: string;
  sequence: string;
  vaaHash?: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface WormholeBalance {
  asset: WormholeAsset;
  balance: number;
  availableBalance: number;  // Balance available for bridging
  wrappedBalance?: number;  // Wrapped version balance
}

export interface WormholeTransaction {
  id: string;
  sourceChain: WormholeChainId;
  destChain: WormholeChainId;
  sourceAsset: WormholeAsset;
  destAsset: WormholeAsset;
  amount: number;
  recipientAddress: string;
  status: 'pending' | 'confirmed' | 'completed' | 'failed';
  transactionHash?: string;
  wormholeSequence?: string;
  vaaHash?: string;
  createdAt: Date;
  completedAt?: Date;
  explorerUrls: WormholeTransferResult['explorerUrls'];
}
