/**
 * Trustline Management for Stellar Assets
 *
 * Provides utilities for establishing trustlines with Freighter wallet
 */

import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { signWithFreighter } from './freighter-integration';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const { Server } = Horizon;

export interface TrustlineAsset {
  code: string;
  issuer: string;
  limit?: string; // Optional limit, defaults to max
}

/**
 * Build and submit a trustline transaction
 *
 * @param publicKey - User's Stellar public key
 * @param asset - Asset to create trustline for
 * @returns Transaction result
 */
export async function establishTrustline(
  publicKey: string,
  asset: TrustlineAsset
): Promise<{
  success: boolean;
  hash: string;
  explorerUrl: string;
}> {
  try {
    const server = new Server(HORIZON_URL);

    // Load account
    console.log('📋 Loading account:', publicKey.substring(0, 8) + '...');
    const account = await server.loadAccount(publicKey);

    // Check if trustline already exists
    const existingTrustline = account.balances.find(
      (b: any) =>
        b.asset_code === asset.code &&
        b.asset_issuer === asset.issuer
    );

    if (existingTrustline) {
      console.log('✅ Trustline already exists for', asset.code);
      return {
        success: true,
        hash: 'existing',
        explorerUrl: '',
      };
    }

    // Build trustline asset
    const stellarAsset = new Asset(asset.code, asset.issuer);

    // Build transaction
    console.log('🏗️  Building trustline transaction for', asset.code);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: stellarAsset,
          limit: asset.limit || '922337203685.4775807', // Max limit
        })
      )
      .setTimeout(180) // 3 minutes
      .build();

    // Get XDR
    const xdr = transaction.toXDR();

    // Sign with Freighter
    console.log('✍️  Requesting signature from Freighter...');
    const signedXDR = await signWithFreighter(xdr);

    // Submit transaction
    console.log('📡 Submitting trustline transaction...');
    const txn = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const result = await server.submitTransaction(txn);

    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${result.hash}`;

    console.log('✅ Trustline established successfully!');
    console.log('  Asset:', asset.code);
    console.log('  Issuer:', asset.issuer.substring(0, 8) + '...');
    console.log('  Hash:', result.hash);
    console.log('  Explorer:', explorerUrl);

    return {
      success: true,
      hash: result.hash,
      explorerUrl,
    };

  } catch (error: any) {
    console.error('❌ Trustline creation failed:', error);

    // Parse Horizon errors
    let errorMessage = error.message;
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = `Failed to establish trustline: ${codes.transaction} (${codes.operations?.join(', ')})`;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Check if an account has a trustline for a specific asset
 *
 * @param publicKey - User's Stellar public key
 * @param asset - Asset to check
 * @returns true if trustline exists
 */
export async function checkTrustline(
  publicKey: string,
  asset: { code: string; issuer?: string }
): Promise<boolean> {
  try {
    if (!asset.issuer) {
      return true; // Native XLM doesn't need trustline
    }

    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(publicKey);

    const balance = account.balances.find(
      (b: any) =>
        b.asset_code === asset.code &&
        b.asset_issuer === asset.issuer
    );

    return !!balance;

  } catch (error) {
    console.error('Error checking trustline:', error);
    return false;
  }
}

/**
 * Get all trustlines for an account
 *
 * @param publicKey - User's Stellar public key
 * @returns List of trustlines
 */
export async function getTrustlines(
  publicKey: string
): Promise<Array<{
  code: string;
  issuer: string;
  balance: string;
  limit: string;
}>> {
  try {
    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(publicKey);

    return account.balances
      .filter((b: any) => b.asset_type !== 'native')
      .map((b: any) => ({
        code: b.asset_code,
        issuer: b.asset_issuer,
        balance: b.balance,
        limit: b.limit,
      }));

  } catch (error) {
    console.error('Error getting trustlines:', error);
    return [];
  }
}

/**
 * Remove a trustline (set limit to 0 with zero balance)
 *
 * @param publicKey - User's Stellar public key
 * @param asset - Asset to remove trustline for
 * @returns Transaction result
 */
export async function removeTrustline(
  publicKey: string,
  asset: TrustlineAsset
): Promise<{
  success: boolean;
  hash: string;
  explorerUrl: string;
}> {
  try {
    const server = new Server(HORIZON_URL);

    // Load account
    const account = await server.loadAccount(publicKey);

    // Check if balance is zero
    const balance = account.balances.find(
      (b: any) =>
        b.asset_code === asset.code &&
        b.asset_issuer === asset.issuer
    );

    if (!balance) {
      throw new Error('Trustline does not exist');
    }

    if (parseFloat(balance.balance) > 0) {
      throw new Error('Cannot remove trustline with non-zero balance. Please send or trade all tokens first.');
    }

    // Build trustline asset
    const stellarAsset = new Asset(asset.code, asset.issuer);

    // Build transaction to remove trustline (set limit to 0)
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.changeTrust({
          asset: stellarAsset,
          limit: '0', // Removes trustline
        })
      )
      .setTimeout(180)
      .build();

    // Get XDR and sign
    const xdr = transaction.toXDR();
    const signedXDR = await signWithFreighter(xdr);

    // Submit transaction
    const txn = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
    const result = await server.submitTransaction(txn);

    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${result.hash}`;

    console.log('✅ Trustline removed successfully!');

    return {
      success: true,
      hash: result.hash,
      explorerUrl,
    };

  } catch (error: any) {
    console.error('❌ Trustline removal failed:', error);
    throw new Error(error.message || 'Failed to remove trustline');
  }
}
