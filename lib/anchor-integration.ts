import { Asset } from '@stellar/stellar-sdk';
import { config, getServiceConfig, ServiceUnavailableError } from './config';

// Anchor Integration for SEP-1, SEP-24, and SEP-31
// This handles off-chain anchor providers and their protocols

export interface AnchorInfo {
  domain: string;
  name: string;
  description: string;
  version: string;
  networkPassphrase: string;
  accounts: string[];
  url: string;
  logo: string;
  currencies: AnchorCurrency[];
  features: {
    transferServer: string;
    transferServerSep24: string;
    kycServer: string;
    webAuthEndpoint: string;
    signingKey: string;
  };
}

export interface AnchorCurrency {
  code: string;
  issuer: string;
  status: 'live' | 'test' | 'deprecated';
  displayDecimals: number;
  name: string;
  desc: string;
  conditions: string;
  image: string;
  fixedNumber: number;
  maxNumber: number;
  isUnlimited: boolean;
  isAssetAnchored: boolean;
  anchorAssetType: string;
  anchorAsset: string;
  attestationOfReserve: string;
  redemptionInstructions: string;
  collateralAddresses: string[];
  collateralAddressSignatures: string[];
  regulated: boolean;
  approvalServer: string;
  approvalCriteria: string;
}

export interface DepositInfo {
  how: string;
  eta: number;
  minAmount: number;
  maxAmount: number;
  feeFixed: number;
  feePercent: number;
  extraInfo: Record<string, any>;
}

export interface WithdrawInfo {
  how: string;
  eta: number;
  minAmount: number;
  maxAmount: number;
  feeFixed: number;
  feePercent: number;
  extraInfo: Record<string, any>;
}

export interface AnchorQuote {
  id: string;
  expiresAt: string;
  price: string;
  totalPrice: string;
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  buyAmount: string;
  fee: {
    total: string;
    asset: string;
  };
}

export interface AnchorTransaction {
  id: string;
  status: 'incomplete' | 'pending_user_transfer_start' | 'pending_user_transfer_complete' | 'pending_external' | 'pending_anchor' | 'pending_stellar' | 'completed' | 'no_market' | 'too_small' | 'too_large' | 'error';
  statusEta: number;
  moreInfoUrl: string;
  amountExpected: {
    amount: string;
    asset: string;
  };
  amountIn: {
    amount: string;
    asset: string;
  };
  amountOut: {
    amount: string;
    asset: string;
  };
  amountFee: {
    amount: string;
    asset: string;
  };
  startedAt: string;
  completedAt?: string;
  stellarTransactionId?: string;
  externalTransactionId?: string;
  message?: string;
  refunded?: boolean;
}

export interface KYCInfo {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  providedFields: string[];
  missingFields: string[];
  message?: string;
}

export class AnchorManager {
  private anchorCache: Map<string, AnchorInfo> = new Map();
  private quoteCache: Map<string, AnchorQuote> = new Map();
  private transactionCache: Map<string, AnchorTransaction> = new Map();
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get MoneyGram API access token
   */
  private async getMoneyGramAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const moneygramConfig = getServiceConfig('moneygram') as any;
      
      const response = await fetch(`${moneygramConfig.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: moneygramConfig.clientId,
          client_secret: moneygramConfig.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get MoneyGram access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      return this.accessToken!;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      console.error('Failed to get MoneyGram access token:', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to MoneyGram API
   */
  private async makeMoneyGramRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getMoneyGramAccessToken();
    const moneygramConfig = getServiceConfig('moneygram') as any;
    
    const response = await fetch(`${moneygramConfig.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`MoneyGram API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Load anchor info from stellar.toml (SEP-1)
   */
  async loadAnchorInfo(domain: string): Promise<AnchorInfo> {
    if (this.anchorCache.has(domain)) {
      return this.anchorCache.get(domain)!;
    }

    try {
      const response = await fetch(`https://${domain}/.well-known/stellar.toml`);
      if (!response.ok) {
        throw new Error(`Failed to fetch stellar.toml from ${domain}: ${response.statusText}`);
      }

      const tomlContent = await response.text();
      const anchorInfo = this.parseStellarToml(tomlContent, domain);
      
      this.anchorCache.set(domain, anchorInfo);
      return anchorInfo;
    } catch (error) {
      console.error(`Failed to load anchor info for ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Parse stellar.toml content
   */
  private parseStellarToml(content: string, domain: string): AnchorInfo {
    // In production, you would use a proper TOML parser
    // For demo purposes, we'll create a mock parser
    
    const lines = content.split('\n');
    const info: Partial<AnchorInfo> = {
      domain,
      currencies: [],
      features: {} as any
    };

    for (const line of lines) {
      const [key, value] = line.split('=').map(s => s.trim());
      
      switch (key) {
        case 'FEDERATION_SERVER':
          info.url = value.replace(/"/g, '');
          break;
        case 'TRANSFER_SERVER':
          info.features!.transferServer = value.replace(/"/g, '');
          break;
        case 'TRANSFER_SERVER_SEP0024':
          info.features!.transferServerSep24 = value.replace(/"/g, '');
          break;
        case 'KYC_SERVER':
          info.features!.kycServer = value.replace(/"/g, '');
          break;
        case 'WEB_AUTH_ENDPOINT':
          info.features!.webAuthEndpoint = value.replace(/"/g, '');
          break;
        case 'SIGNING_KEY':
          info.features!.signingKey = value.replace(/"/g, '');
          break;
      }
    }

    // Add mock data for demo
    return {
      domain,
      name: 'Demo Anchor',
      description: 'Demo anchor for testing',
      version: '1.0.0',
      networkPassphrase: 'Test SDF Network ; September 2015',
      accounts: ['GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'],
      url: `https://${domain}`,
      logo: `https://${domain}/logo.png`,
      currencies: [
        {
          code: 'USD',
          issuer: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
          status: 'live',
          displayDecimals: 2,
          name: 'US Dollar',
          desc: 'US Dollar token',
          conditions: 'None',
          image: `https://${domain}/usd.png`,
          fixedNumber: 0,
          maxNumber: 1000000,
          isUnlimited: false,
          isAssetAnchored: true,
          anchorAssetType: 'fiat',
          anchorAsset: 'USD',
          attestationOfReserve: `https://${domain}/attestation`,
          redemptionInstructions: 'Contact support for redemption',
          collateralAddresses: [],
          collateralAddressSignatures: [],
          regulated: true,
          approvalServer: `https://${domain}/approve`,
          approvalCriteria: 'KYC required'
        }
      ],
      features: info.features!
    };
  }

  /**
   * Get deposit info (SEP-24)
   */
  async getDepositInfo(
    anchorDomain: string,
    asset: string,
    account: string,
    memo?: string
  ): Promise<DepositInfo> {
    try {
      const anchorInfo = await this.loadAnchorInfo(anchorDomain);
      const transferServer = anchorInfo.features.transferServerSep24 || anchorInfo.features.transferServer;
      
      if (!transferServer) {
        throw new Error('Transfer server not available for this anchor');
      }

      const params = new URLSearchParams({
        asset,
        account,
        ...(memo && { memo })
      });

      const response = await fetch(`${transferServer}/deposit?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get deposit info: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get deposit info:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal info (SEP-24)
   */
  async getWithdrawInfo(
    anchorDomain: string,
    asset: string,
    account: string,
    memo?: string
  ): Promise<WithdrawInfo> {
    try {
      const anchorInfo = await this.loadAnchorInfo(anchorDomain);
      const transferServer = anchorInfo.features.transferServerSep24 || anchorInfo.features.transferServer;
      
      if (!transferServer) {
        throw new Error('Transfer server not available for this anchor');
      }

      const params = new URLSearchParams({
        asset,
        account,
        ...(memo && { memo })
      });

      const response = await fetch(`${transferServer}/withdraw?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get withdrawal info: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get withdrawal info:', error);
      throw error;
    }
  }

  /**
   * Get quote (SEP-31)
   */
  async getQuote(
    anchorDomain: string,
    sourceAsset: string,
    destinationAsset: string,
    amount: string,
    sourceAccount?: string
  ): Promise<AnchorQuote> {
    try {
      const anchorInfo = await this.loadAnchorInfo(anchorDomain);
      const transferServer = anchorInfo.features.transferServerSep24 || anchorInfo.features.transferServer;
      
      if (!transferServer) {
        throw new Error('Transfer server not available for this anchor');
      }

      const params = new URLSearchParams({
        source_asset: sourceAsset,
        destination_asset: destinationAsset,
        amount,
        ...(sourceAccount && { source_account: sourceAccount })
      });

      const response = await fetch(`${transferServer}/quote?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get quote: ${response.statusText}`);
      }

      const data = await response.json();
      const quote: AnchorQuote = {
        id: data.id,
        expiresAt: data.expires_at,
        price: data.price,
        totalPrice: data.total_price,
        sellAsset: data.sell_asset,
        buyAsset: data.buy_asset,
        sellAmount: data.sell_amount,
        buyAmount: data.buy_amount,
        fee: {
          total: data.fee.total,
          asset: data.fee.asset
        }
      };

      this.quoteCache.set(quote.id, quote);
      return quote;
    } catch (error) {
      console.error('Failed to get quote:', error);
      throw error;
    }
  }

  /**
   * Create transaction (SEP-31)
   */
  async createTransaction(
    anchorDomain: string,
    sourceAsset: string,
    destinationAsset: string,
    amount: string,
    sourceAccount: string,
    destinationAccount: string,
    memo?: string
  ): Promise<AnchorTransaction> {
    try {
      const anchorInfo = await this.loadAnchorInfo(anchorDomain);
      const transferServer = anchorInfo.features.transferServerSep24 || anchorInfo.features.transferServer;
      
      if (!transferServer) {
        throw new Error('Transfer server not available for this anchor');
      }

      const response = await fetch(`${transferServer}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_asset: sourceAsset,
          destination_asset: destinationAsset,
          amount,
          source_account: sourceAccount,
          destination_account: destinationAccount,
          ...(memo && { memo })
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create transaction: ${response.statusText}`);
      }

      const data = await response.json();
      const transaction: AnchorTransaction = {
        id: data.id,
        status: data.status,
        statusEta: data.status_eta,
        moreInfoUrl: data.more_info_url,
        amountExpected: {
          amount: data.amount_expected.amount,
          asset: data.amount_expected.asset
        },
        amountIn: {
          amount: data.amount_in.amount,
          asset: data.amount_in.asset
        },
        amountOut: {
          amount: data.amount_out.amount,
          asset: data.amount_out.asset
        },
        amountFee: {
          amount: data.amount_fee.amount,
          asset: data.amount_fee.asset
        },
        startedAt: data.started_at,
        completedAt: data.completed_at,
        stellarTransactionId: data.stellar_transaction_id,
        externalTransactionId: data.external_transaction_id,
        message: data.message,
        refunded: data.refunded
      };

      this.transactionCache.set(transaction.id, transaction);
      return transaction;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    anchorDomain: string,
    transactionId: string
  ): Promise<AnchorTransaction> {
    try {
      if (this.transactionCache.has(transactionId)) {
        return this.transactionCache.get(transactionId)!;
      }

      const anchorInfo = await this.loadAnchorInfo(anchorDomain);
      const transferServer = anchorInfo.features.transferServerSep24 || anchorInfo.features.transferServer;
      
      if (!transferServer) {
        throw new Error('Transfer server not available for this anchor');
      }

      const response = await fetch(`${transferServer}/transaction/${transactionId}`);
      if (!response.ok) {
        throw new Error(`Failed to get transaction status: ${response.statusText}`);
      }

      const data = await response.json();
      const transaction: AnchorTransaction = {
        id: data.id,
        status: data.status,
        statusEta: data.status_eta,
        moreInfoUrl: data.more_info_url,
        amountExpected: {
          amount: data.amount_expected.amount,
          asset: data.amount_expected.asset
        },
        amountIn: {
          amount: data.amount_in.amount,
          asset: data.amount_in.asset
        },
        amountOut: {
          amount: data.amount_out.amount,
          asset: data.amount_out.asset
        },
        amountFee: {
          amount: data.amount_fee.amount,
          asset: data.amount_fee.asset
        },
        startedAt: data.started_at,
        completedAt: data.completed_at,
        stellarTransactionId: data.stellar_transaction_id,
        externalTransactionId: data.external_transaction_id,
        message: data.message,
        refunded: data.refunded
      };

      this.transactionCache.set(transaction.id, transaction);
      return transaction;
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  /**
   * Check KYC status
   */
  async checkKYCStatus(
    anchorDomain: string,
    account: string
  ): Promise<KYCInfo> {
    try {
      const anchorInfo = await this.loadAnchorInfo(anchorDomain);
      const kycServer = anchorInfo.features.kycServer;
      
      if (!kycServer) {
        return {
          status: 'none',
          providedFields: [],
          missingFields: []
        };
      }

      const response = await fetch(`${kycServer}?account=${account}`);
      if (!response.ok) {
        throw new Error(`Failed to check KYC status: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        status: data.status,
        providedFields: data.provided_fields || [],
        missingFields: data.missing_fields || [],
        message: data.message
      };
    } catch (error) {
      console.error('Failed to check KYC status:', error);
      throw error;
    }
  }

  /**
   * Get MoneyGram real-time quote
   */
  async getMoneyGramQuote(
    sourceCurrency: string,
    destinationCurrency: string,
    amount: number,
    sourceCountry: string = 'US',
    destinationCountry: string = 'PH'
  ): Promise<AnchorQuote> {
    try {
      // This will throw ServiceUnavailableError if not configured
      getServiceConfig('moneygram');

      const data = await this.makeMoneyGramRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          source_currency: sourceCurrency,
          destination_currency: destinationCurrency,
          amount: amount,
          source_country: sourceCountry,
          destination_country: destinationCountry,
        }),
      });

      const quote: AnchorQuote = {
        id: data.quote_id,
        expiresAt: data.expires_at,
        price: data.exchange_rate,
        totalPrice: data.total_amount,
        sellAsset: sourceCurrency,
        buyAsset: destinationCurrency,
        sellAmount: amount.toString(),
        buyAmount: data.destination_amount.toString(),
        fee: {
          total: data.fee_amount.toString(),
          asset: sourceCurrency
        }
      };

      this.quoteCache.set(quote.id, quote);
      return quote;
    } catch (error) {
      console.error('Failed to get MoneyGram quote:', error);
      throw error;
    }
  }

  /**
   * Get MoneyGram fees
   */
  async getMoneyGramFees(
    sourceCurrency: string,
    destinationCurrency: string,
    amount: number
  ): Promise<{ fixed: number; percentage: number; total: number }> {
    try {
      // This will throw ServiceUnavailableError if not configured
      getServiceConfig('moneygram');

      const data = await this.makeMoneyGramRequest('/fees', {
        method: 'POST',
        body: JSON.stringify({
          source_currency: sourceCurrency,
          destination_currency: destinationCurrency,
          amount: amount,
        }),
      });

      return {
        fixed: data.fixed_fee,
        percentage: data.percentage_fee,
        total: data.total_fee
      };
    } catch (error) {
      console.error('Failed to get MoneyGram fees:', error);
      throw error;
    }
  }

  /**
   * Confirm MoneyGram payout
   */
  async confirmMoneyGramPayout(
    transactionId: string,
    confirmationCode: string
  ): Promise<{ status: string; payoutId: string }> {
    try {
      // This will throw ServiceUnavailableError if not configured
      getServiceConfig('moneygram');

      const data = await this.makeMoneyGramRequest(`/payouts/${transactionId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          confirmation_code: confirmationCode,
        }),
      });

      return {
        status: data.status,
        payoutId: data.payout_id
      };
    } catch (error) {
      console.error('Failed to confirm MoneyGram payout:', error);
      throw error;
    }
  }

  /**
   * Get available anchors for a currency
   */
  async getAnchorsForCurrency(currency: string): Promise<AnchorInfo[]> {
    // In production, this would query a directory service or maintain a registry
    // For demo purposes, we'll return mock anchors
    
    const mockAnchors: AnchorInfo[] = [
      {
        domain: 'demo-anchor.com',
        name: 'Demo Anchor',
        description: 'Demo anchor for testing',
        version: '1.0.0',
        networkPassphrase: 'Test SDF Network ; September 2015',
        accounts: ['GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'],
        url: 'https://demo-anchor.com',
        logo: 'https://demo-anchor.com/logo.png',
        currencies: [
          {
            code: currency,
            issuer: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
            status: 'live',
            displayDecimals: 2,
            name: `${currency} Token`,
            desc: `${currency} token`,
            conditions: 'None',
            image: `https://demo-anchor.com/${currency.toLowerCase()}.png`,
            fixedNumber: 0,
            maxNumber: 1000000,
            isUnlimited: false,
            isAssetAnchored: true,
            anchorAssetType: 'fiat',
            anchorAsset: currency,
            attestationOfReserve: 'https://demo-anchor.com/attestation',
            redemptionInstructions: 'Contact support for redemption',
            collateralAddresses: [],
            collateralAddressSignatures: [],
            regulated: true,
            approvalServer: 'https://demo-anchor.com/approve',
            approvalCriteria: 'KYC required'
          }
        ],
        features: {
          transferServer: 'https://demo-anchor.com/transfer',
          transferServerSep24: 'https://demo-anchor.com/sep24',
          kycServer: 'https://demo-anchor.com/kyc',
          webAuthEndpoint: 'https://demo-anchor.com/auth',
          signingKey: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
        }
      }
    ];

    return mockAnchors;
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.anchorCache.clear();
    this.quoteCache.clear();
    this.transactionCache.clear();
  }
}

// Default anchor manager instance
export const anchorManager = new AnchorManager();
