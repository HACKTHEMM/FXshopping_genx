/**
 * Freighter Wallet Integration
 *
 * Handles connection, signing, and interaction with Freighter browser extension.
 * https://www.freighter.app/
 */

import {
  isConnected,
  getAddress,
  signTransaction,
  getNetwork,
  setAllowed,
} from '@stellar/freighter-api';

/**
 * Check if Freighter extension is installed
 *
 * @returns true if Freighter is available, false otherwise
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    if ('error' in result && result.error) {
      return false;
    }
    return result.isConnected;
  } catch (error) {
    return false;
  }
}

/**
 * Connect to Freighter wallet and get user's public key
 *
 * @returns User's Stellar public key (G...)
 * @throws Error if Freighter is not installed or user rejects
 */
export async function connectFreighter(): Promise<string> {
  try {
    // Check if Freighter is installed
    const installed = await isFreighterInstalled();

    if (!installed) {
      throw new Error(
        'Freighter wallet not found. Please install from https://www.freighter.app/'
      );
    }

    // Request permission (if not already granted)
    const allowedResult = await setAllowed();
    if ('error' in allowedResult && allowedResult.error) {
      throw new Error('Permission denied');
    }

    // Get public key
    const addressResult = await getAddress();
    if ('error' in addressResult && addressResult.error) {
      throw new Error('Failed to get address');
    }

    console.log('✅ Connected to Freighter:', addressResult.address.substring(0, 8) + '...');

    return addressResult.address;

  } catch (error: any) {
    console.error('Freighter connection error:', error);

    if (error.message?.includes('User declined access')) {
      throw new Error('Please approve the connection request in Freighter');
    }

    throw new Error(`Failed to connect to Freighter: ${error.message}`);
  }
}

/**
 * Check if user is on Stellar testnet
 *
 * @returns true if on testnet, false if on mainnet or other network
 */
export async function isOnTestnet(): Promise<boolean> {
  try {
    const networkResult = await getNetwork();
    if ('error' in networkResult && networkResult.error) {
      return false;
    }
    return networkResult.network === 'TESTNET';
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
}

/**
 * Sign a transaction with Freighter
 *
 * @param xdr - Unsigned transaction XDR
 * @returns Signed transaction XDR
 * @throws Error if user rejects or signing fails
 */
export async function signWithFreighter(xdr: string): Promise<string> {
  try {
    console.log('Requesting signature from Freighter...');

    // Check network
    const onTestnet = await isOnTestnet();
    if (!onTestnet) {
      throw new Error(
        'Please switch to Stellar Testnet in Freighter settings'
      );
    }

    // Request signature
    const signResult = await signTransaction(xdr, {
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    // Check for error in response
    if ('error' in signResult && signResult.error) {
      console.error('❌ Freighter signing error details:', signResult.error);

      // Check for specific error types
      if (typeof signResult.error === 'string') {
        throw new Error(signResult.error);
      } else if (signResult.error.message) {
        throw new Error(signResult.error.message);
      } else {
        throw new Error('Failed to sign transaction. Please check Freighter wallet.');
      }
    }

    // Verify we got a signed transaction
    if (!signResult.signedTxXdr) {
      throw new Error('No signed transaction returned from Freighter');
    }

    console.log('✅ Transaction signed successfully');

    return signResult.signedTxXdr;

  } catch (error: any) {
    console.error('❌ Freighter signing error:', error);

    // User declined/cancelled
    if (error.message?.includes('User declined') ||
        error.message?.includes('User cancelled') ||
        error.message?.includes('rejected')) {
      throw new Error('Transaction cancelled by user');
    }

    // Network mismatch
    if (error.message?.includes('network') || error.message?.includes('Network')) {
      throw new Error('Network mismatch. Please ensure Freighter is on Testnet.');
    }

    // Timeout
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      throw new Error('Signing timeout. Please try again.');
    }

    // Generic error with details
    const errorMsg = error.message || 'Unknown error';
    throw new Error(`Failed to sign transaction: ${errorMsg}`);
  }
}

/**
 * Complete flow: Connect, build, sign, and submit transaction
 *
 * Helper function that wraps the entire process
 */
export interface FreighterTransactionResult {
  success: boolean;
  publicKey?: string;
  hash?: string;
  ledger?: number;
  explorerUrl?: string;
  error?: string;
}

/**
 * Get network info for display
 *
 * @returns Network name and passphrase
 */
export async function getNetworkInfo(): Promise<{
  network: string;
  isTestnet: boolean;
}> {
  try {
    const networkResult = await getNetwork();
    if ('error' in networkResult && networkResult.error) {
      return {
        network: 'Unknown',
        isTestnet: false,
      };
    }
    return {
      network: networkResult.network === 'TESTNET' ? 'Testnet' : networkResult.network === 'PUBLIC' ? 'Mainnet' : 'Unknown',
      isTestnet: networkResult.network === 'TESTNET',
    };
  } catch (error) {
    return {
      network: 'Unknown',
      isTestnet: false,
    };
  }
}

/**
 * Error messages for common Freighter issues
 */
export const FREIGHTER_ERRORS = {
  NOT_INSTALLED: 'Freighter wallet not installed. Please install from https://www.freighter.app/',
  USER_DECLINED: 'Connection or transaction was declined by user',
  WRONG_NETWORK: 'Please switch to Stellar Testnet in Freighter settings',
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete transaction',
  NO_TRUSTLINE: 'Trustline not established for this asset. Please add trustline in Freighter.',
};

/**
 * Parse Freighter error and return user-friendly message
 *
 * @param error - Error from Freighter API
 * @returns User-friendly error message
 */
export function parseFreighterError(error: any): string {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('not found') || message.includes('not installed')) {
    return FREIGHTER_ERRORS.NOT_INSTALLED;
  }

  if (message.includes('declined') || message.includes('rejected')) {
    return FREIGHTER_ERRORS.USER_DECLINED;
  }

  if (message.includes('network') || message.includes('testnet')) {
    return FREIGHTER_ERRORS.WRONG_NETWORK;
  }

  if (message.includes('balance')) {
    return FREIGHTER_ERRORS.INSUFFICIENT_BALANCE;
  }

  if (message.includes('trustline') || message.includes('trust')) {
    return FREIGHTER_ERRORS.NO_TRUSTLINE;
  }

  return error.message || 'An unknown error occurred';
}
