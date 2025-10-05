import { 
  streamPayments, 
  streamTransactions, 
  streamOffers,
  stellarServer,
  StellarError 
} from './stellar';

// Real-time streaming service for payment monitoring and status updates

export interface StreamEvent {
  type: 'payment' | 'transaction' | 'offer' | 'error' | 'reconnect';
  data: any;
  timestamp: string;
  accountId?: string;
}

export interface StreamSubscription {
  id: string;
  type: 'payments' | 'transactions' | 'offers';
  accountId?: string;
  callback: (event: StreamEvent) => void;
  isActive: boolean;
  reconnectAttempts: number;
  lastEventTime: string;
}

export interface StreamManagerConfig {
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  eventBufferSize: number;
  enableHeartbeat: boolean;
}

export class StreamingService {
  private subscriptions: Map<string, StreamSubscription> = new Map();
  private eventBuffer: StreamEvent[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: StreamManagerConfig;
  private isActive: boolean = false;

  constructor(config: Partial<StreamManagerConfig> = {}) {
    this.config = {
      maxReconnectAttempts: 10,
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      eventBufferSize: 1000,
      enableHeartbeat: true,
      ...config
    };
  }

  /**
   * Start the streaming service
   */
  start(): void {
    if (this.isActive) {
      console.warn('Streaming service is already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 Starting streaming service...');

    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  /**
   * Stop the streaming service
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    console.log('🛑 Stopping streaming service...');

    // Stop all subscriptions
    for (const [id, subscription] of this.subscriptions) {
      this.unsubscribe(id);
    }

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear event buffer
    this.eventBuffer = [];
  }

  /**
   * Subscribe to payment events
   */
  subscribeToPayments(
    accountId: string | undefined,
    callback: (event: StreamEvent) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('payments', accountId);
    
    const subscription: StreamSubscription = {
      id: subscriptionId,
      type: 'payments',
      accountId,
      callback,
      isActive: true,
      reconnectAttempts: 0,
      lastEventTime: new Date().toISOString()
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.startPaymentStream(subscription);

    console.log(`📡 Subscribed to payments${accountId ? ` for account ${accountId}` : ''}`);
    return subscriptionId;
  }

  /**
   * Subscribe to transaction events
   */
  subscribeToTransactions(
    accountId: string | undefined,
    callback: (event: StreamEvent) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('transactions', accountId);
    
    const subscription: StreamSubscription = {
      id: subscriptionId,
      type: 'transactions',
      accountId,
      callback,
      isActive: true,
      reconnectAttempts: 0,
      lastEventTime: new Date().toISOString()
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.startTransactionStream(subscription);

    console.log(`📡 Subscribed to transactions${accountId ? ` for account ${accountId}` : ''}`);
    return subscriptionId;
  }

  /**
   * Subscribe to offer events
   */
  subscribeToOffers(
    accountId: string | undefined,
    callback: (event: StreamEvent) => void
  ): string {
    const subscriptionId = this.generateSubscriptionId('offers', accountId);
    
    const subscription: StreamSubscription = {
      id: subscriptionId,
      type: 'offers',
      accountId,
      callback,
      isActive: true,
      reconnectAttempts: 0,
      lastEventTime: new Date().toISOString()
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.startOfferStream(subscription);

    console.log(`📡 Subscribed to offers${accountId ? ` for account ${accountId}` : ''}`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from a stream
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);
    
    console.log(`📡 Unsubscribed from ${subscription.type}${subscription.accountId ? ` for account ${subscription.accountId}` : ''}`);
    return true;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): StreamSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  /**
   * Get event buffer
   */
  getEventBuffer(): StreamEvent[] {
    return [...this.eventBuffer];
  }

  /**
   * Clear event buffer
   */
  clearEventBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * Start payment stream
   */
  private startPaymentStream(subscription: StreamSubscription): void {
    if (!subscription.isActive) {
      return;
    }

    try {
      const cleanup = streamPayments(
        subscription.accountId,
        (payment) => {
          if (subscription.isActive) {
            const event: StreamEvent = {
              type: 'payment',
              data: payment,
              timestamp: new Date().toISOString(),
              accountId: subscription.accountId
            };

            this.handleStreamEvent(event, subscription);
          }
        },
        (error) => {
          if (subscription.isActive) {
            this.handleStreamError(error, subscription);
          }
        }
      );

      // Store cleanup function for later use
      (subscription as any).cleanup = cleanup;
    } catch (error) {
      this.handleStreamError(error as Error, subscription);
    }
  }

  /**
   * Start transaction stream
   */
  private startTransactionStream(subscription: StreamSubscription): void {
    if (!subscription.isActive) {
      return;
    }

    try {
      const cleanup = streamTransactions(
        subscription.accountId,
        (transaction) => {
          if (subscription.isActive) {
            const event: StreamEvent = {
              type: 'transaction',
              data: transaction,
              timestamp: new Date().toISOString(),
              accountId: subscription.accountId
            };

            this.handleStreamEvent(event, subscription);
          }
        },
        (error) => {
          if (subscription.isActive) {
            this.handleStreamError(error, subscription);
          }
        }
      );

      // Store cleanup function for later use
      (subscription as any).cleanup = cleanup;
    } catch (error) {
      this.handleStreamError(error as Error, subscription);
    }
  }

  /**
   * Start offer stream
   */
  private startOfferStream(subscription: StreamSubscription): void {
    if (!subscription.isActive) {
      return;
    }

    try {
      const cleanup = streamOffers(
        subscription.accountId,
        (offer) => {
          if (subscription.isActive) {
            const event: StreamEvent = {
              type: 'offer',
              data: offer,
              timestamp: new Date().toISOString(),
              accountId: subscription.accountId
            };

            this.handleStreamEvent(event, subscription);
          }
        },
        (error) => {
          if (subscription.isActive) {
            this.handleStreamError(error, subscription);
          }
        }
      );

      // Store cleanup function for later use
      (subscription as any).cleanup = cleanup;
    } catch (error) {
      this.handleStreamError(error as Error, subscription);
    }
  }

  /**
   * Handle stream event
   */
  private handleStreamEvent(event: StreamEvent, subscription: StreamSubscription): void {
    // Update subscription last event time
    subscription.lastEventTime = event.timestamp;
    subscription.reconnectAttempts = 0;

    // Add to event buffer
    this.addToEventBuffer(event);

    // Call subscription callback
    try {
      subscription.callback(event);
    } catch (error) {
      console.error('Error in subscription callback:', error);
    }
  }

  /**
   * Handle stream error
   */
  private handleStreamError(error: Error, subscription: StreamSubscription): void {
    console.error(`Stream error for subscription ${subscription.id}:`, error);

    const errorEvent: StreamEvent = {
      type: 'error',
      data: {
        message: error.message,
        subscriptionId: subscription.id,
        subscriptionType: subscription.type,
        accountId: subscription.accountId
      },
      timestamp: new Date().toISOString(),
      accountId: subscription.accountId
    };

    this.addToEventBuffer(errorEvent);

    // Attempt reconnection
    if (subscription.reconnectAttempts < this.config.maxReconnectAttempts) {
      subscription.reconnectAttempts++;
      
      console.log(`Attempting to reconnect subscription ${subscription.id} (attempt ${subscription.reconnectAttempts})`);
      
      setTimeout(() => {
        if (subscription.isActive) {
          this.reconnectSubscription(subscription);
        }
      }, this.config.reconnectInterval);
    } else {
      console.error(`Max reconnection attempts reached for subscription ${subscription.id}`);
      subscription.isActive = false;
    }
  }

  /**
   * Reconnect subscription
   */
  private reconnectSubscription(subscription: StreamSubscription): void {
    if (!subscription.isActive) {
      return;
    }

    // Cleanup existing stream
    if ((subscription as any).cleanup) {
      (subscription as any).cleanup();
    }

    // Restart stream based on type
    switch (subscription.type) {
      case 'payments':
        this.startPaymentStream(subscription);
        break;
      case 'transactions':
        this.startTransactionStream(subscription);
        break;
      case 'offers':
        this.startOfferStream(subscription);
        break;
    }

    const reconnectEvent: StreamEvent = {
      type: 'reconnect',
      data: {
        subscriptionId: subscription.id,
        subscriptionType: subscription.type,
        accountId: subscription.accountId,
        attempt: subscription.reconnectAttempts
      },
      timestamp: new Date().toISOString(),
      accountId: subscription.accountId
    };

    this.addToEventBuffer(reconnectEvent);
  }

  /**
   * Add event to buffer
   */
  private addToEventBuffer(event: StreamEvent): void {
    this.eventBuffer.push(event);
    
    // Maintain buffer size
    if (this.eventBuffer.length > this.config.eventBufferSize) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.isActive) {
        return;
      }

      const now = new Date();
      const heartbeatThreshold = new Date(now.getTime() - this.config.heartbeatInterval);

      // Check for stale subscriptions
      for (const [id, subscription] of this.subscriptions) {
        if (subscription.isActive) {
          const lastEventTime = new Date(subscription.lastEventTime);
          
          if (lastEventTime < heartbeatThreshold) {
            console.warn(`Subscription ${id} appears stale, attempting reconnection`);
            this.reconnectSubscription(subscription);
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(type: string, accountId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const account = accountId ? accountId.substr(0, 8) : 'global';
    return `${type}_${account}_${timestamp}_${random}`;
  }

  /**
   * Get service status
   */
  getStatus(): {
    isActive: boolean;
    subscriptionCount: number;
    eventBufferSize: number;
    config: StreamManagerConfig;
  } {
    return {
      isActive: this.isActive,
      subscriptionCount: this.subscriptions.size,
      eventBufferSize: this.eventBuffer.length,
      config: this.config
    };
  }
}

// Default streaming service instance
export const streamingService = new StreamingService();

// Utility functions for common streaming patterns

/**
 * Monitor payment status for a specific transaction
 */
export function monitorPaymentStatus(
  transactionHash: string,
  onStatusUpdate: (status: string, data: any) => void,
  timeout: number = 300000 // 5 minutes
): string {
  const startTime = Date.now();
  
  const subscriptionId = streamingService.subscribeToTransactions(
    undefined, // Monitor all transactions
    (event) => {
      if (event.data.hash === transactionHash) {
        onStatusUpdate(event.data.status, event.data);
        
        // Unsubscribe once we find the transaction
        streamingService.unsubscribe(subscriptionId);
      }
    }
  );

  // Set timeout
  setTimeout(() => {
    streamingService.unsubscribe(subscriptionId);
    onStatusUpdate('timeout', { message: 'Payment monitoring timeout' });
  }, timeout);

  return subscriptionId;
}

/**
 * Monitor account balance changes
 */
export function monitorAccountBalances(
  accountId: string,
  onBalanceChange: (balance: any) => void
): string {
  return streamingService.subscribeToPayments(
    accountId,
    (event) => {
      if (event.data.type === 'payment' && 
          (event.data.from === accountId || event.data.to === accountId)) {
        onBalanceChange(event.data);
      }
    }
  );
}

/**
 * Monitor order book changes for an asset pair
 */
export function monitorOrderBook(
  sellingAsset: string,
  buyingAsset: string,
  onOrderBookChange: (offer: any) => void
): string {
  return streamingService.subscribeToOffers(
    undefined, // Monitor all offers
    (event) => {
      if (event.data.selling?.asset_code === sellingAsset && 
          event.data.buying?.asset_code === buyingAsset) {
        onOrderBookChange(event.data);
      }
    }
  );
}
