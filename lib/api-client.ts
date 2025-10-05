import { PaymentRoute, PathPaymentQuery } from './stellar';

// API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// Types for API responses
export interface SearchRoutesResponse {
  success: boolean;
  query: {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
  };
  routes: PaymentRoute[];
  summary: {
    totalRoutes: number;
    bestRoute: PaymentRoute | null;
    savings: {
      vsWorst: number;
      vsAverage: number;
    };
    routeTypes: {
      stellar: number;
      offchain: number;
    };
  };
  timestamp: string;
}

export interface ExecutePaymentResponse {
  success: boolean;
  transaction: {
    id: string;
    hash?: string;
    providerTransactionId?: string;
    stellarTransactionHash?: string;
    sourceAccount: string;
    targetAccount: string;
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
    targetAmount: number;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'completed';
    network: 'testnet' | 'offchain';
    timestamp: string;
    fees: {
      stellarFee: number;
      providerFee?: number;
      totalFees: number;
    };
    memo?: string;
  };
  execution: {
    method: string;
    estimatedTime: string;
    actualTime: string;
    confirmationBlocks?: number;
  };
  tracking?: {
    stellarExplorerUrl?: string;
    providerTrackingUrl?: string;
  };
}

export interface TransactionStatusResponse {
  success: boolean;
  transaction: {
    id?: string;
    hash?: string;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'completed';
    sourceAccount: string;
    targetAccount: string;
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
    targetAmount: number;
    fees: {
      stellarFee: number;
      providerFee?: number;
      totalFees: number;
    };
    netRecipientAmount: number;
    timestamp: string;
    confirmations: number;
    network: 'testnet' | 'offchain';
    memo?: string;
  };
  execution: {
    method: string;
    estimatedTime: string;
    actualTime: string;
    confirmationBlocks?: number;
  };
  tracking: {
    stellarExplorerUrl?: string;
    providerTrackingUrl?: string;
  };
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  type: 'native' | 'token' | 'fiat';
  decimals: number;
  icon: string;
  network: 'stellar' | 'offchain';
  issuer?: string;
  description: string;
}

export interface CurrenciesResponse {
  success: boolean;
  currencies: CurrencyInfo[];
  popularPairs: Array<{
    from: string;
    to: string;
    name: string;
    volume: 'high' | 'medium' | 'low';
  }>;
  exchangeRates: {
    timestamp: string;
    base: string;
    rates: Record<string, number>;
  };
  limits: {
    minimum: number;
    maximum: number;
    default: number;
  };
  supportedNetworks: Array<{
    name: string;
    code: string;
    type: string;
    description: string;
  }>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    api: {
      status: string;
      latency: number;
    };
    stellar: {
      status: string;
      latency: number;
      network: string;
      horizonUrl: string;
    };
    database: {
      status: string;
      latency: number;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  environment: string;
}

// API Client Class
export class StellarFXAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search for optimal payment routes
   */
  async searchRoutes(query: PathPaymentQuery): Promise<SearchRoutesResponse> {
    return this.request<SearchRoutesResponse>('/routes/search', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  /**
   * Execute a payment using a selected route
   */
  async executePayment(params: {
    routeId: string;
    sourceAccount: string;
    targetAccount: string;
    memo?: string;
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
    targetAmount: number;
    routeType: string;
  }): Promise<ExecutePaymentResponse> {
    return this.request<ExecutePaymentResponse>('/routes/execute', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(
    transactionId?: string,
    transactionHash?: string
  ): Promise<TransactionStatusResponse> {
    const params = new URLSearchParams();
    if (transactionId) params.append('transactionId', transactionId);
    if (transactionHash) params.append('transactionHash', transactionHash);

    const endpoint = `/routes/status?${params.toString()}`;
    return this.request<TransactionStatusResponse>(endpoint);
  }

  /**
   * Get supported currencies and exchange rates
   */
  async getCurrencies(): Promise<CurrenciesResponse> {
    return this.request<CurrenciesResponse>('/currencies');
  }

  /**
   * Check API health status
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const currencies = await this.getCurrencies();
    const baseRate = currencies.exchangeRates.rates[fromCurrency];
    const targetRate = currencies.exchangeRates.rates[toCurrency];
    
    if (!baseRate || !targetRate) {
      throw new Error(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
    }
    
    return targetRate / baseRate;
  }

  /**
   * Calculate estimated fees for a route
   */
  calculateRouteFees(
    sourceAmount: number,
    route: PaymentRoute
  ): {
    totalFees: number;
    netAmount: number;
    feePercentage: number;
  } {
    const totalFees = route.fees.totalFees;
    const netAmount = route.netRecipientAmount;
    const feePercentage = (totalFees / sourceAmount) * 100;

    return {
      totalFees,
      netAmount,
      feePercentage,
    };
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(
    amount: number,
    currency: string,
    decimals: number = 2
  ): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return formatter.format(amount);
  }

  /**
   * Get transaction explorer URL
   */
  getTransactionExplorerUrl(
    hash: string,
    network: 'testnet' | 'mainnet' = 'testnet'
  ): string {
    const baseUrl = network === 'testnet' 
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
    
    return `${baseUrl}/tx/${hash}`;
  }
}

// Default API client instance
export const apiClient = new StellarFXAPI();

// Utility functions
export const formatAmount = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 95) return 'text-green-600';
  if (confidence >= 85) return 'text-yellow-600';
  if (confidence >= 70) return 'text-orange-600';
  return 'text-red-600';
};

export const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 95) return 'Very High';
  if (confidence >= 85) return 'High';
  if (confidence >= 70) return 'Medium';
  return 'Low';
};
