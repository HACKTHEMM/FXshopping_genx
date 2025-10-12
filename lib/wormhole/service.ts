/**
 * Wormhole Service - Core cross-chain bridging functionality
 * Handles asset bridging between Ethereum, Solana, and other supported chains
 */

import { 
  WormholeChainId, 
  WormholeAsset, 
  WormholeRoute, 
  WormholeTransferRequest, 
  WormholeTransferResult,
  WormholeQuote,
  WormholeConfig,
  WormholeBalance,
  WormholeTransaction,
  WormholeEvent
} from './types';

export class WormholeService {
  private config: WormholeConfig;
  private eventListeners: Map<string, (event: WormholeEvent) => void> = new Map();

  constructor(config: WormholeConfig) {
    this.config = config;
  }

  /**
   * Get supported chains and their configurations
   */
  getSupportedChains(): WormholeChainId[] {
    return Object.keys(this.config.chains) as WormholeChainId[];
  }

  /**
   * Get supported assets for a specific chain
   */
  getSupportedAssets(chainId: WormholeChainId): WormholeAsset[] {
    return this.config.supportedAssets.filter(asset => asset.chainId === chainId);
  }

  /**
   * Get quote for cross-chain transfer
   */
  async getQuote(
    sourceChain: WormholeChainId,
    destChain: WormholeChainId,
    sourceAsset: WormholeAsset,
    amount: number
  ): Promise<WormholeQuote> {
    try {
      // Find destination asset (wrapped version if needed)
      const destAsset = await this.findDestinationAsset(sourceAsset, destChain);
      
      // Calculate fees
      const fees = await this.calculateFees(sourceChain, destChain, sourceAsset, amount);
      
      // Calculate exchange rate (1:1 for same asset, adjusted for fees)
      const exchangeRate = this.calculateExchangeRate(sourceAsset, destAsset, fees);
      
      // Calculate receive amount
      const receiveAmount = (amount * exchangeRate) - fees.totalFees;
      
      // Estimate completion time
      const estimatedTime = this.estimateCompletionTime(sourceChain, destChain);
      
      // Determine if destination asset is wrapped
      const isWrapped = destAsset.type === 'wrapped' || 
                      (sourceAsset.symbol !== destAsset.symbol && destAsset.type !== 'native');

      const quote: WormholeQuote = {
        routeId: this.generateRouteId(sourceChain, destChain, sourceAsset, destAsset),
        sourceAsset,
        destAsset,
        sendAmount: amount,
        receiveAmount,
        exchangeRate,
        fees,
        estimatedTime,
        isWrapped,
        liquidityDepth: await this.getLiquidityDepth(destAsset),
        providerName: 'Wormhole Bridge',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };

      return quote;
    } catch (error) {
      throw new Error(`Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple route options for comparison
   */
  async getRoutes(
    sourceChain: WormholeChainId,
    destChain: WormholeChainId,
    sourceAsset: WormholeAsset,
    amount: number
  ): Promise<WormholeRoute[]> {
    const routes: WormholeRoute[] = [];
    
    try {
      // Primary route: Direct bridge
      const primaryQuote = await this.getQuote(sourceChain, destChain, sourceAsset, amount);
      const primaryRoute = await this.buildRoute(primaryQuote);
      routes.push(primaryRoute);

      // Alternative route: Via intermediate chain (if applicable)
      if (this.shouldOfferIntermediateRoute(sourceChain, destChain)) {
        const intermediateChain = this.getBestIntermediateChain(sourceChain, destChain);
        const intermediateQuote = await this.getQuote(sourceChain, intermediateChain, sourceAsset, amount);
        const intermediateRoute = await this.buildRoute(intermediateQuote);
        routes.push(intermediateRoute);
      }

      // Sort by best receive amount
      return routes.sort((a, b) => b.receiveAmount - a.receiveAmount);
    } catch (error) {
      console.error('Error getting routes:', error);
      return routes;
    }
  }

  /**
   * Initiate cross-chain transfer
   */
  async initiateTransfer(request: WormholeTransferRequest): Promise<WormholeTransferResult> {
    try {
      // Validate request
      await this.validateTransferRequest(request);

      // Get quote to ensure valid route
      const quote = await this.getQuote(
        request.sourceChain,
        request.destChain,
        request.sourceAsset,
        request.amount
      );

      // Build transaction steps
      const steps = await this.buildTransferSteps(request, quote);

      // Execute first step (lock/burn on source chain)
      const firstStep = steps[0];
      const txResult = await this.executeStep(firstStep, request);

      if (!txResult.success) {
        throw new Error('Transfer initiation failed');
      }

      // Return result with transaction details
      return {
        success: true,
        transactionHash: txResult.transactionHash,
        wormholeSequence: txResult.wormholeSequence,
        vaaHash: txResult.vaaHash,
        explorerUrls: {
          source: this.getExplorerUrl(request.sourceChain, txResult.transactionHash),
          wormhole: this.getWormholeExplorerUrl(txResult.wormholeSequence)
        },
        estimatedCompletionTime: new Date(Date.now() + quote.estimatedTime * 1000)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        explorerUrls: {}
      };
    }
  }

  /**
   * Check transfer status
   */
  async getTransferStatus(transactionHash: string, sequence?: string): Promise<WormholeTransaction> {
    try {
      // This would typically query Wormhole's API or blockchain
      // For now, return a mock status
      return {
        id: sequence || transactionHash,
        sourceChain: 'ethereum',
        destChain: 'solana',
        sourceAsset: this.config.supportedAssets[0],
        destAsset: this.config.supportedAssets[1],
        amount: 0,
        recipientAddress: '',
        status: 'pending',
        transactionHash,
        wormholeSequence: sequence,
        createdAt: new Date(),
        explorerUrls: {
          source: this.getExplorerUrl('ethereum', transactionHash),
          wormhole: sequence ? this.getWormholeExplorerUrl(sequence) : undefined
        }
      };
    } catch (error) {
      throw new Error(`Failed to get transfer status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's balances across chains
   */
  async getBalances(address: string, chainId?: WormholeChainId): Promise<WormholeBalance[]> {
    const balances: WormholeBalance[] = [];
    const chains = chainId ? [chainId] : this.getSupportedChains();

    for (const chain of chains) {
      try {
        const chainBalances = await this.getChainBalances(address, chain);
        balances.push(...chainBalances);
      } catch (error) {
        console.error(`Failed to get balances for ${chain}:`, error);
      }
    }

    return balances;
  }

  /**
   * Subscribe to transfer events
   */
  subscribeToEvents(eventType: string, callback: (event: WormholeEvent) => void): string {
    const subscriptionId = Math.random().toString(36).substring(7);
    this.eventListeners.set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribeFromEvents(subscriptionId: string): void {
    this.eventListeners.delete(subscriptionId);
  }

  // Private helper methods

  private async findDestinationAsset(sourceAsset: WormholeAsset, destChain: WormholeChainId): Promise<WormholeAsset> {
    // Find matching asset on destination chain
    const destAssets = this.getSupportedAssets(destChain);
    
    // First try to find exact match
    let destAsset = destAssets.find(asset => 
      asset.symbol === sourceAsset.symbol && 
      asset.type === sourceAsset.type
    );

    // If not found, create wrapped version
    if (!destAsset) {
      destAsset = {
        chainId: destChain,
        address: this.getWrappedTokenAddress(sourceAsset, destChain),
        symbol: `W${sourceAsset.symbol}`,
        decimals: sourceAsset.decimals,
        type: 'wrapped',
        wrappedAddress: this.getWrappedTokenAddress(sourceAsset, destChain)
      };
    }

    return destAsset;
  }

  private async calculateFees(
    sourceChain: WormholeChainId,
    destChain: WormholeChainId,
    asset: WormholeAsset,
    amount: number
  ) {
    // const sourceConfig = this.config.chains[sourceChain];
    // const destConfig = this.config.chains[destChain];

    // Wormhole protocol fee (typically 0.01% of amount)
    const wormholeFee = amount * 0.0001;

    // Gas fee estimation (simplified)
    const gasFee = this.estimateGasFee(sourceChain, asset);

    // Optional relay fee for automatic completion
    const relayFee = destChain === 'solana' ? 0.001 : 0; // SOL for relay

    return {
      wormholeFee,
      gasFee,
      relayFee,
      totalFees: wormholeFee + gasFee + relayFee
    };
  }

  private calculateExchangeRate(sourceAsset: WormholeAsset, destAsset: WormholeAsset, fees: { totalFees: number }): number {
    // For same asset bridging, rate is 1:1 minus fees
    if (sourceAsset.symbol === destAsset.symbol) {
      return 1 - (fees.totalFees / 1000); // Simplified calculation
    }

    // For different assets, would need price oracle
    // For now, return 1:1 as placeholder
    return 1;
  }

  private estimateCompletionTime(sourceChain: WormholeChainId, destChain: WormholeChainId): number {
    const sourceConfig = this.config.chains[sourceChain];
    const destConfig = this.config.chains[destChain];
    
    // Base time: source confirmation + dest confirmation + relay time
    const baseTime = (sourceConfig.blockTime * 12) + (destConfig.blockTime * 12) + 60;
    
    // Add extra time for cross-chain relay
    return baseTime + 300; // 5 minutes for relay
  }

  private async getLiquidityDepth(_asset: WormholeAsset): Promise<number> {
    // Mock liquidity depth calculation
    // In production, this would query actual liquidity pools
    return Math.random() * 1000000; // Random liquidity between 0-1M
  }

  private async buildRoute(quote: WormholeQuote): Promise<WormholeRoute> {
    const steps = await this.buildTransferSteps({
      sourceChain: quote.sourceAsset.chainId,
      destChain: quote.destAsset.chainId,
      sourceAsset: quote.sourceAsset,
      destAsset: quote.destAsset,
      amount: quote.sendAmount,
      recipientAddress: ''
    }, quote);

    return {
      routeId: quote.routeId,
      sourceAsset: quote.sourceAsset,
      destAsset: quote.destAsset,
      sourceChain: quote.sourceAsset.chainId,
      destChain: quote.destAsset.chainId,
      sendAmount: quote.sendAmount,
      receiveAmount: quote.receiveAmount,
      exchangeRate: quote.exchangeRate,
      fees: quote.fees,
      estimatedTime: quote.estimatedTime,
      steps,
      riskScore: this.calculateRiskScore(quote),
      isWrapped: quote.isWrapped,
      contractAddresses: {
        sourceBridge: this.config.chains[quote.sourceAsset.chainId].bridgeAddress,
        destBridge: this.config.chains[quote.destAsset.chainId].bridgeAddress,
        tokenBridge: this.config.chains[quote.sourceAsset.chainId].tokenBridgeAddress
      }
    };
  }

  private async buildTransferSteps(request: WormholeTransferRequest, quote: WormholeQuote) {
    const steps = [];

    // Step 1: Lock/Burn on source chain
    steps.push({
      stepId: 'source_lock',
      chainId: request.sourceChain,
      action: (request.sourceChain === 'ethereum' ? 'lock' : 'burn') as 'lock' | 'burn',
      asset: request.sourceAsset,
      amount: request.amount,
      estimatedTime: this.config.chains[request.sourceChain].blockTime * 12,
      gasRequired: this.estimateGasFee(request.sourceChain, request.sourceAsset),
      contractAddress: this.config.chains[request.sourceChain].bridgeAddress,
      description: `Lock ${request.amount} ${request.sourceAsset.symbol} on ${request.sourceChain}`
    });

    // Step 2: Mint/Unlock on destination chain
    steps.push({
      stepId: 'dest_mint',
      chainId: request.destChain,
      action: (request.destChain === 'ethereum' ? 'unlock' : 'mint') as 'unlock' | 'mint',
      asset: quote.destAsset,
      amount: quote.receiveAmount,
      estimatedTime: this.config.chains[request.destChain].blockTime * 12,
      contractAddress: this.config.chains[request.destChain].bridgeAddress,
      description: `Mint ${quote.receiveAmount} ${quote.destAsset.symbol} on ${request.destChain}`
    });

    return steps;
  }

  private async validateTransferRequest(request: WormholeTransferRequest): Promise<void> {
    // Validate chains are supported
    if (!this.config.chains[request.sourceChain] || !this.config.chains[request.destChain]) {
      throw new Error('Unsupported chain');
    }

    // Validate assets are supported
    const sourceAssets = this.getSupportedAssets(request.sourceChain);
    const destAssets = this.getSupportedAssets(request.destChain);

    if (!sourceAssets.find(a => a.address === request.sourceAsset.address)) {
      throw new Error('Unsupported source asset');
    }

    if (!destAssets.find(a => a.address === request.destAsset.address)) {
      throw new Error('Unsupported destination asset');
    }

    // Validate amount
    if (request.amount <= 0) {
      throw new Error('Invalid amount');
    }
  }

  private async executeStep(_step: unknown, _request: WormholeTransferRequest): Promise<{
    success: boolean;
    transactionHash: string;
    wormholeSequence: string;
    vaaHash: string;
  }> {
    // Mock execution - in production this would interact with actual contracts
    // Generate a proper Ethereum transaction hash (66 characters including 0x)
    const randomHex = Math.random().toString(16).substring(2, 18); // Generate 16 hex chars
    const txHash = `0x${randomHex.padEnd(64, '0')}`; // Pad to 64 chars total
    const sequence = Math.floor(Math.random() * 1000000).toString();
    
    // Validate the generated hash
    if (!this.isValidTransactionHash(txHash)) {
      throw new Error('Failed to generate valid transaction hash');
    }
    
    return {
      success: true,
      transactionHash: txHash,
      wormholeSequence: sequence,
      vaaHash: `0x${randomHex.padEnd(64, '0')}`
    };
  }

  private isValidTransactionHash(hash: string): boolean {
    // Ethereum transaction hash should be 66 characters (0x + 64 hex chars)
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  private async getChainBalances(address: string, chainId: WormholeChainId): Promise<WormholeBalance[]> {
    // Mock balance fetching - in production this would query actual balances
    const assets = this.getSupportedAssets(chainId);
    return assets.map(asset => ({
      asset,
      balance: Math.random() * 1000,
      availableBalance: Math.random() * 1000,
      wrappedBalance: asset.type === 'wrapped' ? Math.random() * 100 : undefined
    }));
  }

  private generateRouteId(sourceChain: WormholeChainId, destChain: WormholeChainId, sourceAsset: WormholeAsset, destAsset: WormholeAsset): string {
    return `wormhole-${sourceChain}-${destChain}-${sourceAsset.symbol}-${destAsset.symbol}`;
  }

  private shouldOfferIntermediateRoute(sourceChain: WormholeChainId, destChain: WormholeChainId): boolean {
    // Offer intermediate routes for certain chain combinations
    return (sourceChain === 'ethereum' && destChain === 'solana') ||
           (sourceChain === 'solana' && destChain === 'ethereum');
  }

  private getBestIntermediateChain(sourceChain: WormholeChainId, destChain: WormholeChainId): WormholeChainId {
    // Return best intermediate chain for routing
    if (sourceChain === 'ethereum' && destChain === 'solana') return 'polygon';
    if (sourceChain === 'solana' && destChain === 'ethereum') return 'polygon';
    return 'polygon'; // Default intermediate
  }

  private calculateRiskScore(quote: WormholeQuote): number {
    // Calculate risk score based on various factors
    let risk = 0.1; // Base risk

    // Higher risk for wrapped assets
    if (quote.isWrapped) risk += 0.2;

    // Higher risk for longer completion times
    if (quote.estimatedTime > 1800) risk += 0.1; // 30 minutes

    // Higher risk for low liquidity
    if (quote.liquidityDepth && quote.liquidityDepth < 10000) risk += 0.2;

    return Math.min(risk, 1.0);
  }

  private estimateGasFee(chainId: WormholeChainId, _asset: WormholeAsset): number {
    const config = this.config.chains[chainId];
    // Simplified gas estimation
    return config.blockTime * 0.001; // Mock calculation
  }

  private getWrappedTokenAddress(_sourceAsset: WormholeAsset, _destChain: WormholeChainId): string {
    // Mock wrapped token address generation
    return `0x${Math.random().toString(16).substring(2, 42)}`;
  }

  private getExplorerUrl(chainId: WormholeChainId, txHash: string): string {
    const config = this.config.chains[chainId];
    return `${config.explorerUrl}/tx/${txHash}`;
  }

  private getWormholeExplorerUrl(sequence: string): string {
    // Wormhole explorer uses sequence numbers in the URL
    // Ensure we have a valid sequence number
    const validSequence = sequence || Math.floor(Math.random() * 1000000).toString();
    return `https://wormholescan.io/tx/${validSequence}`;
  }
}
