import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import { config, getServiceConfig, ServiceUnavailableError } from './config';

// Freight Wallet SDK Integration
// Note: This is a mock implementation. In production, you would use the actual Freight Wallet SDK

export interface WalletConnection {
  publicKey: string;
  isConnected: boolean;
  network: 'testnet' | 'mainnet';
  walletType: 'freight' | 'albedo' | 'ledger' | 'trezor';
}

export interface WalletSignResult {
  signedTransaction: string;
  signature: string;
  publicKey: string;
}

export interface WalletBalance {
  asset: string;
  balance: string;
  limit?: string;
  issuer?: string;
}

export class FreightWalletManager {
  private connection: WalletConnection | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Initialize Freight Wallet with OAuth flow
   */
  async initializeOAuth(): Promise<string> {
    const freightWalletConfig = getServiceConfig('freightWallet') as any;

    const authUrl = new URL(`${freightWalletConfig.apiUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', freightWalletConfig.clientId);
    authUrl.searchParams.set('redirect_uri', freightWalletConfig.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'wallet:read wallet:write transaction:sign');
    authUrl.searchParams.set('state', this.generateState());

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<void> {
    const freightWalletConfig = getServiceConfig('freightWallet') as any;

    try {
      const response = await fetch(`${freightWalletConfig.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: freightWalletConfig.clientId,
          code: code,
          redirect_uri: freightWalletConfig.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange code for token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const freightWalletConfig = getServiceConfig('freightWallet') as any;
      
      const response = await fetch(`${freightWalletConfig.apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

      return this.accessToken!;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  /**
   * Get valid access token
   */
  private async getValidAccessToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      if (this.refreshToken) {
        return await this.refreshAccessToken();
      } else {
        throw new Error('No valid access token available. Please re-authenticate.');
      }
    }
    return this.accessToken;
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private setupEventListeners() {
    // Listen for wallet connection events
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleWalletMessage.bind(this));
    }
  }

  private handleWalletMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;

    const { type, data } = event.data;
    
    switch (type) {
      case 'WALLET_CONNECTED':
        this.connection = data;
        this.emit('connected', data);
        break;
      case 'WALLET_DISCONNECTED':
        this.connection = null;
        this.emit('disconnected', data);
        break;
      case 'TRANSACTION_SIGNED':
        this.emit('transactionSigned', data);
        break;
      case 'TRANSACTION_FAILED':
        this.emit('transactionFailed', data);
        break;
    }
  }

  /**
   * Connect to Freight Wallet
   */
  async connectWallet(): Promise<WalletConnection> {
    try {
      // In production, this would use the actual Freight Wallet SDK
      // For demo purposes, we'll simulate a connection
      
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection not available in server environment');
      }

      // Check if Freight Wallet is available
      if (!this.isFreightWalletAvailable()) {
        throw new Error('Freight Wallet not detected. Please install the Freight Wallet extension.');
      }

      // Simulate wallet connection
      const mockConnection: WalletConnection = {
        publicKey: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
        isConnected: true,
        network: 'testnet',
        walletType: 'freight'
      };

      this.connection = mockConnection;
      this.emit('connected', mockConnection);
      
      return mockConnection;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnectWallet(): Promise<void> {
    if (this.connection) {
      this.connection = null;
      this.emit('disconnected', null);
    }
  }

  /**
   * Check if Freight Wallet is available
   */
  isFreightWalletAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for Freight Wallet extension
    return !!(window as any).freightWallet || !!(window as any).stellar;
  }

  /**
   * Get current wallet connection
   */
  getConnection(): WalletConnection | null {
    return this.connection;
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): string | null {
    return this.connection?.publicKey || null;
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: Transaction): Promise<WalletSignResult> {
    if (!this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // In production, this would use the actual Freight Wallet SDK
      // For demo purposes, we'll simulate transaction signing
      
      const transactionXdr = transaction.toXDR();
      const mockSignature = this.generateMockSignature();
      
      const result: WalletSignResult = {
        signedTransaction: transactionXdr,
        signature: mockSignature,
        publicKey: this.connection.publicKey
      };

      this.emit('transactionSigned', result);
      return result;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      this.emit('transactionFailed', error);
      throw error;
    }
  }

  /**
   * Get wallet balances
   */
  async getBalances(): Promise<WalletBalance[]> {
    if (!this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // In production, this would fetch real balances from the wallet
      // For demo purposes, we'll return mock balances
      
      const mockBalances: WalletBalance[] = [
        {
          asset: 'XLM',
          balance: '1000.0000000'
        },
        {
          asset: 'USDC',
          balance: '500.0000000',
          issuer: 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3'
        }
      ];

      return mockBalances;
    } catch (error) {
      console.error('Failed to get balances:', error);
      throw error;
    }
  }

  /**
   * Request wallet permissions
   */
  async requestPermissions(permissions: string[]): Promise<boolean> {
    if (!this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // In production, this would request actual permissions from the wallet
      // For demo purposes, we'll simulate permission grant
      
      console.log('Requesting permissions:', permissions);
      return true;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Generate mock signature for demo purposes
   */
  private generateMockSignature(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Alternative wallet integrations for broader compatibility

export class AlbedoWalletManager {
  private connection: WalletConnection | null = null;

  async connectWallet(): Promise<WalletConnection> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Albedo connection not available in server environment');
      }

      // Check if Albedo is available
      if (!(window as any).albedo) {
        throw new Error('Albedo not detected. Please install the Albedo extension.');
      }

      // In production, this would use the actual Albedo SDK
      const mockConnection: WalletConnection = {
        publicKey: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
        isConnected: true,
        network: 'testnet',
        walletType: 'albedo'
      };

      this.connection = mockConnection;
      return mockConnection;
    } catch (error) {
      console.error('Failed to connect to Albedo:', error);
      throw error;
    }
  }

  async signTransaction(transaction: Transaction): Promise<WalletSignResult> {
    if (!this.connection) {
      throw new Error('Albedo not connected');
    }

    // In production, this would use the actual Albedo SDK
    const transactionXdr = transaction.toXDR();
    const mockSignature = this.generateMockSignature();
    
    return {
      signedTransaction: transactionXdr,
      signature: mockSignature,
      publicKey: this.connection.publicKey
    };
  }

  private generateMockSignature(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export class LedgerWalletManager {
  private connection: WalletConnection | null = null;

  async connectWallet(): Promise<WalletConnection> {
    try {
      // In production, this would use the actual Ledger SDK
      const mockConnection: WalletConnection = {
        publicKey: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
        isConnected: true,
        network: 'testnet',
        walletType: 'ledger'
      };

      this.connection = mockConnection;
      return mockConnection;
    } catch (error) {
      console.error('Failed to connect to Ledger:', error);
      throw error;
    }
  }

  async signTransaction(transaction: Transaction): Promise<WalletSignResult> {
    if (!this.connection) {
      throw new Error('Ledger not connected');
    }

    // In production, this would use the actual Ledger SDK
    const transactionXdr = transaction.toXDR();
    const mockSignature = this.generateMockSignature();
    
    return {
      signedTransaction: transactionXdr,
      signature: mockSignature,
      publicKey: this.connection.publicKey
    };
  }

  private generateMockSignature(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Wallet factory for easy switching between wallet types
export class WalletFactory {
  static createWallet(type: 'freight' | 'albedo' | 'ledger'): FreightWalletManager | AlbedoWalletManager | LedgerWalletManager {
    switch (type) {
      case 'freight':
        return new FreightWalletManager();
      case 'albedo':
        return new AlbedoWalletManager();
      case 'ledger':
        return new LedgerWalletManager();
      default:
        throw new Error(`Unsupported wallet type: ${type}`);
    }
  }

  static getAvailableWallets(): string[] {
    const available: string[] = [];
    
    if (typeof window !== 'undefined') {
      if ((window as any).freightWallet || (window as any).stellar) {
        available.push('freight');
      }
      if ((window as any).albedo) {
        available.push('albedo');
      }
      // Ledger detection would require USB API
      available.push('ledger');
    }
    
    return available;
  }
}

// Default wallet manager instance
export const walletManager = new FreightWalletManager();
