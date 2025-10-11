/**
 * Soroban Smart Contract Integration
 *
 * This module provides TypeScript bindings for interacting with
 * FXshopping Soroban smart contracts on Stellar.
 */

import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

// Network configuration
const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Contract IDs (to be updated after deployment)
export const CONTRACT_IDS = {
  FX_EXCHANGE: process.env.NEXT_PUBLIC_FX_EXCHANGE_CONTRACT || '',
  ESCROW: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || '',
  ROUTER: process.env.NEXT_PUBLIC_ROUTER_CONTRACT || '',
};

// Initialize Soroban RPC server
const server = new SorobanRpc.Server(RPC_URL);

/**
 * Asset representation for Soroban contracts
 */
export interface SorobanAsset {
  code: string;
  issuer?: string; // undefined for native XLM
}

/**
 * Swap quote from contract
 */
export interface SwapQuote {
  amountOut: string;
  rate: string;
  fee: string;
  priceImpact: string;
}

/**
 * Swap parameters
 */
export interface SwapParams {
  fromAsset: SorobanAsset;
  toAsset: SorobanAsset;
  amount: string;
  minReceive: string;
  sender: string;
}

/**
 * Transaction result
 */
export interface SorobanTxResult {
  success: boolean;
  hash: string;
  ledger?: number;
  result?: any;
  error?: string;
}

/**
 * Convert asset to Soroban Address type
 */
function assetToAddress(asset: SorobanAsset): Address {
  if (!asset.issuer) {
    // Native XLM - use special native address
    return Address.fromString('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
  }
  return Address.contract(Buffer.from(asset.issuer, 'hex'));
}

/**
 * FX Exchange Contract Client
 */
export class FXExchangeContract {
  private contract: Contract;

  constructor(contractId: string = CONTRACT_IDS.FX_EXCHANGE) {
    if (!contractId) {
      throw new Error('FX Exchange contract ID not configured');
    }
    this.contract = new Contract(contractId);
  }

  /**
   * Get a quote for a swap (read-only call)
   */
  async getQuote(
    fromAsset: SorobanAsset,
    toAsset: SorobanAsset,
    amount: string
  ): Promise<SwapQuote> {
    try {
      // Build the contract call
      const tx = new TransactionBuilder(
        await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'), // placeholder
        {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      )
        .addOperation(
          this.contract.call(
            'get_quote',
            assetToAddress(fromAsset),
            assetToAddress(toAsset),
            nativeToScVal(amount, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      // Simulate the transaction
      const simulated = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        if (result) {
          const quote = scValToNative(result);
          return {
            amountOut: quote.amount_out.toString(),
            rate: quote.rate.toString(),
            fee: quote.fee.toString(),
            priceImpact: quote.price_impact.toString(),
          };
        }
      }

      throw new Error('Failed to simulate quote transaction');
    } catch (error: any) {
      console.error('Error getting quote:', error);
      throw new Error(`Failed to get quote: ${error.message}`);
    }
  }

  /**
   * Build a swap transaction (for signing)
   */
  async buildSwapTransaction(params: SwapParams): Promise<string> {
    try {
      // Load sender account
      const account = await server.getAccount(params.sender);

      // Build transaction
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'swap',
            Address.fromString(params.sender),
            assetToAddress(params.fromAsset),
            assetToAddress(params.toAsset),
            nativeToScVal(params.amount, { type: 'i128' }),
            nativeToScVal(params.minReceive, { type: 'i128' })
          )
        )
        .setTimeout(180)
        .build();

      // Simulate to get auth and resource estimates
      const simulated = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        // Assemble the transaction with simulation results
        const prepared = SorobanRpc.assembleTransaction(tx, simulated);
        return prepared.build().toXDR();
      }

      throw new Error('Transaction simulation failed');
    } catch (error: any) {
      console.error('Error building swap transaction:', error);
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
  }

  /**
   * Get current exchange rate
   */
  async getRate(
    fromAsset: SorobanAsset,
    toAsset: SorobanAsset
  ): Promise<string> {
    try {
      const tx = new TransactionBuilder(
        await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
        {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      )
        .addOperation(
          this.contract.call(
            'get_rate',
            assetToAddress(fromAsset),
            assetToAddress(toAsset)
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        if (result) {
          return scValToNative(result).toString();
        }
      }

      throw new Error('Failed to get rate');
    } catch (error: any) {
      console.error('Error getting rate:', error);
      throw new Error(`Failed to get rate: ${error.message}`);
    }
  }
}

/**
 * Escrow Contract Client
 */
export class EscrowContract {
  private contract: Contract;

  constructor(contractId: string = CONTRACT_IDS.ESCROW) {
    if (!contractId) {
      throw new Error('Escrow contract ID not configured');
    }
    this.contract = new Contract(contractId);
  }

  /**
   * Create an escrow deposit
   */
  async deposit(
    sender: string,
    asset: SorobanAsset,
    amount: string,
    recipient: string,
    timeoutSeconds: number
  ): Promise<string> {
    try {
      const account = await server.getAccount(sender);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'deposit',
            Address.fromString(sender),
            assetToAddress(asset),
            nativeToScVal(amount, { type: 'i128' }),
            Address.fromString(recipient),
            nativeToScVal(timeoutSeconds, { type: 'u64' })
          )
        )
        .setTimeout(180)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const prepared = SorobanRpc.assembleTransaction(tx, simulated);
        return prepared.build().toXDR();
      }

      throw new Error('Escrow deposit simulation failed');
    } catch (error: any) {
      console.error('Error creating escrow:', error);
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
  }

  /**
   * Release escrow funds
   */
  async release(sender: string, escrowId: number): Promise<string> {
    try {
      const account = await server.getAccount(sender);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'release',
            nativeToScVal(escrowId, { type: 'u64' })
          )
        )
        .setTimeout(180)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const prepared = SorobanRpc.assembleTransaction(tx, simulated);
        return prepared.build().toXDR();
      }

      throw new Error('Escrow release simulation failed');
    } catch (error: any) {
      console.error('Error releasing escrow:', error);
      throw new Error(`Failed to release escrow: ${error.message}`);
    }
  }
}

/**
 * Router Contract Client
 */
export class RouterContract {
  private contract: Contract;

  constructor(contractId: string = CONTRACT_IDS.ROUTER) {
    if (!contractId) {
      throw new Error('Router contract ID not configured');
    }
    this.contract = new Contract(contractId);
  }

  /**
   * Find best swap path
   */
  async findBestPath(
    fromAsset: SorobanAsset,
    toAsset: SorobanAsset,
    amount: string
  ): Promise<any> {
    try {
      const tx = new TransactionBuilder(
        await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
        {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      )
        .addOperation(
          this.contract.call(
            'find_best_path',
            assetToAddress(fromAsset),
            assetToAddress(toAsset),
            nativeToScVal(amount, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        if (result) {
          return scValToNative(result);
        }
      }

      throw new Error('Failed to find path');
    } catch (error: any) {
      console.error('Error finding path:', error);
      throw new Error(`Failed to find path: ${error.message}`);
    }
  }
}

/**
 * Submit a signed transaction to the network
 */
export async function submitSorobanTransaction(
  signedXDR: string
): Promise<SorobanTxResult> {
  try {
    const tx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);

    console.log('Submitting Soroban transaction...');
    const response = await server.sendTransaction(tx);

    if (response.status === 'PENDING') {
      console.log('Transaction pending, polling for result...');

      // Poll for transaction result
      let getResponse = await server.getTransaction(response.hash);
      let attempts = 0;
      const maxAttempts = 20;

      while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(response.hash);
        attempts++;
      }

      if (getResponse.status === 'SUCCESS') {
        console.log('✅ Transaction successful');

        return {
          success: true,
          hash: response.hash,
          ledger: getResponse.ledger,
          result: getResponse.returnValue,
        };
      }

      return {
        success: false,
        hash: response.hash,
        error: 'Transaction failed or timed out',
      };
    }

    return {
      success: false,
      hash: response.hash,
      error: `Transaction status: ${response.status}`,
    };
  } catch (error: any) {
    console.error('Error submitting transaction:', error);
    return {
      success: false,
      hash: '',
      error: error.message,
    };
  }
}

/**
 * Helper: Check if contracts are configured
 */
export function areContractsConfigured(): boolean {
  return !!(
    CONTRACT_IDS.FX_EXCHANGE &&
    CONTRACT_IDS.ESCROW &&
    CONTRACT_IDS.ROUTER
  );
}

/**
 * Helper: Get contract explorer URLs
 */
export function getContractExplorerUrl(
  contractId: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): string {
  return `https://stellar.expert/explorer/${network}/contract/${contractId}`;
}
