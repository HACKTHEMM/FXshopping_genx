import { 
  Keypair, 
  Asset, 
  Operation, 
  TransactionBuilder, 
  Networks, 
  BASE_FEE,
  Memo,
  MemoType,
  Transaction,
  xdr
} from '@stellar/stellar-sdk';
import Server from '@stellar/stellar-sdk';

import { config } from './config';

// Initialize Stellar server with environment configuration
export const stellarServer = new Server(config.stellar.horizonUrl);

// Stellar network configuration
export const STELLAR_NETWORK = config.stellar.networkPassphrase;
export const BASE_FEE_AMOUNT = config.stellar.baseFee;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Streaming configuration
export const STREAMING_CONFIG = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

// Common asset definitions
export const ASSETS = {
  XLM: Asset.native(),
  USDC: new Asset('USDC', 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'),
  USD: new Asset('USD', 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'),
  EUR: new Asset('EUR', 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'),
  INR: new Asset('INR', 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'),
  PHP: new Asset('PHP', 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'),
  GBP: new Asset('GBP', 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'),
};

// Currency to asset mapping
export const CURRENCY_TO_ASSET = {
  'XLM': ASSETS.XLM,
  'USDC': ASSETS.USDC,
  'USD': ASSETS.USD,
  'EUR': ASSETS.EUR,
  'INR': ASSETS.INR,
  'PHP': ASSETS.PHP,
  'GBP': ASSETS.GBP,
};

// Interface for payment route
export interface PaymentRoute {
  id: string;
  type: 'stellar_onchain' | 'stellar_anchor' | 'offchain_fx';
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  fees: {
    stellarFee: number;
    anchorFee?: number;
    fxSpread?: number;
    totalFees: number;
  };
  netRecipientAmount: number;
  provider: {
    name: string;
    address?: string;
    anchorInfo?: {
      code: string;
      domain: string;
    };
  };
  estimatedTime: string;
  confidence: number; // 0-100%
  requiresKYC?: boolean;
  path?: any[];
  liquidity?: {
    source: number;
    destination: number;
    pathLength: number;
  };
  quote?: {
    id: string;
    expiresAt: string;
    price: string;
  };
  compliance?: {
    riskScore: number;
    requiresApproval: boolean;
    kycRequired: boolean;
    amlRequired: boolean;
    reasons: string[];
  };
  optimizationScore?: number;
  rank?: number;
}

// Interface for path payment query
export interface PathPaymentQuery {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  sourceAccount?: string;
  targetAccount?: string;
}

// Interface for payment execution
export interface PaymentExecution {
  routeId: string;
  sourceAccount: string;
  targetAccount: string;
  memo?: string;
}

// Enhanced error handling and retry utilities
export class StellarError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'StellarError';
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config = RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Check if error is retryable
      if (error instanceof StellarError && !error.retryable) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Get available path payments from Stellar network with retry logic
 */
export async function getStellarPathPayments(
  sourceAsset: Asset,
  targetAsset: Asset,
  amount: string,
  destination?: string
): Promise<any[]> {
  return withRetry(async () => {
    try {
      let builder = stellarServer
        .strictReceivePaths(sourceAsset, [], targetAsset, amount);
      
      if (destination) {
        builder = builder.destination(destination);
      }
      
      const response = await builder.call();
      return response.records;
    } catch (error: any) {
      if (error.response?.status >= 500) {
        throw new StellarError(
          `Horizon server error: ${error.message}`,
          'HORIZON_ERROR',
          error.response?.status,
          true
        );
      }
      throw new StellarError(
        `Failed to fetch path payments: ${error.message}`,
        'PATH_PAYMENT_ERROR',
        error.response?.status,
        false
      );
    }
  });
}

/**
 * Get strict send paths for better liquidity discovery
 */
export async function getStellarStrictSendPaths(
  sourceAsset: Asset,
  targetAsset: Asset,
  amount: string,
  destination?: string
): Promise<any[]> {
  return withRetry(async () => {
    try {
      let builder = stellarServer
        .strictSendPaths(sourceAsset, amount, targetAsset, []);
      
      if (destination) {
        builder = builder.destination(destination);
      }
      
      const response = await builder.call();
      return response.records;
    } catch (error: any) {
      if (error.response?.status >= 500) {
        throw new StellarError(
          `Horizon server error: ${error.message}`,
          'HORIZON_ERROR',
          error.response?.status,
          true
        );
      }
      throw new StellarError(
        `Failed to fetch strict send paths: ${error.message}`,
        'STRICT_SEND_ERROR',
        error.response?.status,
        false
      );
    }
  });
}

/**
 * Get order book for asset pair
 */
export async function getOrderBook(
  selling: Asset,
  buying: Asset,
  limit: number = 20
): Promise<any> {
  try {
    const response = await stellarServer
      .orderbook(selling, buying)
      .limit(limit)
      .call();
    
    return response;
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
}

/**
 * Get account information with comprehensive details
 */
export async function getAccountInfo(accountId: string): Promise<any | null> {
  return withRetry(async () => {
    try {
      const account = await stellarServer.loadAccount(accountId);
      return account;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new StellarError(
          `Account not found: ${accountId}`,
          'ACCOUNT_NOT_FOUND',
          404,
          false
        );
      }
      if (error.response?.status >= 500) {
        throw new StellarError(
          `Horizon server error: ${error.message}`,
          'HORIZON_ERROR',
          error.response?.status,
          true
        );
      }
      throw new StellarError(
        `Failed to fetch account info: ${error.message}`,
        'ACCOUNT_ERROR',
        error.response?.status,
        false
      );
    }
  });
}

/**
 * Get account balances with trustlines
 */
export async function getAccountBalances(accountId: string): Promise<any[]> {
  return withRetry(async () => {
    try {
      const account = await stellarServer.loadAccount(accountId);
      return account.balances;
    } catch (error: any) {
      if (error.response?.status >= 500) {
        throw new StellarError(
          `Horizon server error: ${error.message}`,
          'HORIZON_ERROR',
          error.response?.status,
          true
        );
      }
      throw new StellarError(
        `Failed to fetch account balances: ${error.message}`,
        'BALANCE_ERROR',
        error.response?.status,
        false
      );
    }
  });
}

/**
 * Get account trustlines
 */
export async function getAccountTrustlines(accountId: string): Promise<any[]> {
  return withRetry(async () => {
    try {
      const response = await stellarServer
        .accounts()
        .accountId(accountId)
        .call();
      
      return response.balances.filter((balance: any) => 
        balance.asset_type !== 'native'
      );
    } catch (error: any) {
      if (error.response?.status >= 500) {
        throw new StellarError(
          `Horizon server error: ${error.message}`,
          'HORIZON_ERROR',
          error.response?.status,
          true
        );
      }
      throw new StellarError(
        `Failed to fetch trustlines: ${error.message}`,
        'TRUSTLINE_ERROR',
        error.response?.status,
        false
      );
    }
  });
}

/**
 * Calculate path payment
 */
export async function calculatePathPayment(
  sourceAsset: Asset,
  targetAsset: Asset,
  sourceAmount: string,
  destination: string
): Promise<any> {
  try {
    const response = await stellarServer
      .strictReceivePaths(sourceAsset, [], targetAsset, sourceAmount)
      .destination(destination)
      .call();
    
    return response.records[0];
  } catch (error) {
    console.error('Error calculating path payment:', error);
    return null;
  }
}

/**
 * Build and submit transaction with enhanced error handling
 */
export async function buildTransaction(
  sourceAccount: Keypair,
  operations: Operation[],
  memo?: string,
  timeout: number = 30
): Promise<any> {
  return withRetry(async () => {
    try {
      const account = await stellarServer.loadAccount(sourceAccount.publicKey());
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE_AMOUNT.toString(),
        networkPassphrase: STELLAR_NETWORK,
      });

      operations.forEach(op => transaction.addOperation(op as any));
      
      if (memo) {
        transaction.addMemo(Memo.text(memo));
      }

      transaction.setTimeout(timeout);
      
      const tx = transaction.build();
      tx.sign(sourceAccount);
      
      const response = await stellarServer.submitTransaction(tx);
      return response;
    } catch (error: any) {
      if (error.response?.status >= 500) {
        throw new StellarError(
          `Horizon server error: ${error.message}`,
          'HORIZON_ERROR',
          error.response?.status,
          true
        );
      }
      throw new StellarError(
        `Transaction failed: ${error.message}`,
        'TRANSACTION_ERROR',
        error.response?.status,
        false
      );
    }
  });
}

/**
 * Build path payment transaction
 */
export async function buildPathPaymentTransaction(
  sourceAccount: Keypair,
  sourceAsset: Asset,
  sourceAmount: string,
  destination: string,
  destAsset: Asset,
  destMin: string,
  memo?: string
): Promise<Transaction> {
  const account = await stellarServer.loadAccount(sourceAccount.publicKey());
  
  const operation = Operation.pathPaymentStrictReceive({
    sendAsset: sourceAsset,
    sendMax: sourceAmount,
    destination: destination,
    destAsset: destAsset,
    destAmount: destMin,
  });

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE_AMOUNT.toString(),
    networkPassphrase: STELLAR_NETWORK,
  })
    .addOperation(operation)
    .setTimeout(30);

  if (memo) {
    transaction.addMemo(Memo.text(memo));
  }

  return transaction.build();
}

/**
 * Stream payments for real-time monitoring
 */
export function streamPayments(
  accountId: string | undefined,
  onPayment: (payment: any) => void,
  onError?: (error: Error) => void
): () => void {
  let stream: any;
  let reconnectAttempts = 0;
  let isActive = true;

  const startStream = () => {
    try {
      let builder = stellarServer.payments();
      
      if (accountId) {
        builder = builder.forAccount(accountId);
      }

      stream = builder.stream({
        onmessage: (payment: any) => {
          if (isActive) {
            onPayment(payment);
          }
        },
        onerror: (error: Error) => {
          console.error('Streaming error:', error);
          if (onError) {
            onError(error);
          }
          
          if (isActive && reconnectAttempts < STREAMING_CONFIG.maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(() => {
              if (isActive) {
                startStream();
              }
            }, STREAMING_CONFIG.reconnectInterval);
          }
        }
      });
    } catch (error) {
      console.error('Failed to start payment stream:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  startStream();

  // Return cleanup function
  return () => {
    isActive = false;
    if (stream) {
      stream();
    }
  };
}

/**
 * Stream offers for real-time order book updates
 */
export function streamOffers(
  accountId: string | undefined,
  onOffer: (offer: any) => void,
  onError?: (error: Error) => void
): () => void {
  let stream: any;
  let reconnectAttempts = 0;
  let isActive = true;

  const startStream = () => {
    try {
      let builder = stellarServer.offers();
      
      if (accountId) {
        builder = builder.forAccount(accountId);
      }

      stream = builder.stream({
        onmessage: (offer: any) => {
          if (isActive) {
            onOffer(offer);
          }
        },
        onerror: (error: Error) => {
          console.error('Offer streaming error:', error);
          if (onError) {
            onError(error);
          }
          
          if (isActive && reconnectAttempts < STREAMING_CONFIG.maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(() => {
              if (isActive) {
                startStream();
              }
            }, STREAMING_CONFIG.reconnectInterval);
          }
        }
      });
    } catch (error) {
      console.error('Failed to start offer stream:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  startStream();

  return () => {
    isActive = false;
    if (stream) {
      stream();
    }
  };
}

/**
 * Stream transactions for real-time status updates
 */
export function streamTransactions(
  accountId: string | undefined,
  onTransaction: (transaction: any) => void,
  onError?: (error: Error) => void
): () => void {
  let stream: any;
  let reconnectAttempts = 0;
  let isActive = true;

  const startStream = () => {
    try {
      let builder = stellarServer.transactions();
      
      if (accountId) {
        builder = builder.forAccount(accountId);
      }

      stream = builder.stream({
        onmessage: (transaction: any) => {
          if (isActive) {
            onTransaction(transaction);
          }
        },
        onerror: (error: Error) => {
          console.error('Transaction streaming error:', error);
          if (onError) {
            onError(error);
          }
          
          if (isActive && reconnectAttempts < STREAMING_CONFIG.maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(() => {
              if (isActive) {
                startStream();
              }
            }, STREAMING_CONFIG.reconnectInterval);
          }
        }
      });
    } catch (error) {
      console.error('Failed to start transaction stream:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  startStream();

  return () => {
    isActive = false;
    if (stream) {
      stream();
    }
  };
}

/**
 * Validate account address
 */
export function isValidStellarAddress(address: string): boolean {
  try {
    Keypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate new keypair for testing
 */
export function generateKeypair(): Keypair {
  return Keypair.random();
}

/**
 * Get asset from currency code
 */
export function getAssetFromCurrency(currency: string): Asset {
  const asset = (CURRENCY_TO_ASSET as any)[currency.toUpperCase()];
  if (!asset) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return asset;
}
