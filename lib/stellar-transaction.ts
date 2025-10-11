/**
 * Stellar Transaction Builder
 *
 * Builds XDR transactions for path payments on Stellar testnet.
 * Used with Freighter wallet for signing and submission.
 */

import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { RouteQuote } from './types/route';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const { Server } = Horizon;

/**
 * Build a path payment transaction for the selected route
 *
 * @param sourcePublicKey - User's Stellar public key (from Freighter)
 * @param route - The selected route from comparison
 * @param destinationAddress - Optional recipient address (defaults to source)
 * @returns Transaction XDR string for signing
 */
export async function buildPathPaymentTransaction(
  sourcePublicKey: string,
  route: RouteQuote,
  destinationAddress?: string
): Promise<string> {
  try {
    const server = new Server(HORIZON_URL);

    // Load source account from Horizon
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    // Determine destination (self if not specified)
    const destination = destinationAddress || sourcePublicKey;

    // Build assets
    const sendAsset = route.sendAsset.issuer
      ? new Asset(route.sendAsset.code, route.sendAsset.issuer)
      : Asset.native();

    const destAsset = route.destAsset.issuer
      ? new Asset(route.destAsset.code, route.destAsset.issuer)
      : Asset.native();

    // CRITICAL: Calculate the correct send and receive amounts
    // The route may have anchor deposit/withdrawal legs that aren't on-chain
    
    // 1. Determine actual on-chain send amount (after deposit fees if any)
    let actualSendAmount = route.grossSend;
    
    // Check if first leg is an anchor deposit (fiat → token)
    const firstLeg = route.legs[0];
    if (firstLeg && firstLeg.type === 'anchor-deposit') {
      // After deposit fee, we have less tokens to send on-chain
      const depositFee = firstLeg.fees.reduce((sum, f) => sum + f.amount, 0);
      actualSendAmount = route.grossSend - depositFee;
      console.log(`📝 Deposit fee detected: ${depositFee} ${route.sendAsset.code}`);
      console.log(`   Adjusting send amount: ${route.grossSend} → ${actualSendAmount}`);
    }
    
    // 2. Determine expected on-chain receive amount (before withdrawal if any)
    let expectedReceive: number;
    
    if (route.onChainReceive && route.onChainReceive > 0) {
      // Use the on-chain amount (most accurate for path payment)
      expectedReceive = route.onChainReceive;
      console.log('✅ Using onChainReceive:', expectedReceive, route.destAsset.code);
    } else {
      // Fallback: calculate from rate (less accurate)
      expectedReceive = actualSendAmount * route.effectiveRate;
      console.log('⚠️  Calculated from rate:', expectedReceive, '=', actualSendAmount, '*', route.effectiveRate);
    }

    // 3. Apply slippage tolerance to get minimum acceptable amount
    // For testnet with low liquidity, use aggressive slippage tolerance
    // Production should use 1-3% max
    const slippageTolerance = 0.25; // 25% slippage tolerance for testnet
    const destMin = (expectedReceive * (1 - slippageTolerance)).toFixed(7);
    
    // Sanity checks
    if (parseFloat(destMin) <= 0) {
      throw new Error(`Invalid destMin calculated: ${destMin}. Expected receive: ${expectedReceive}`);
    }
    
    if (actualSendAmount <= 0) {
      throw new Error(`Invalid send amount: ${actualSendAmount}. Gross send: ${route.grossSend}`);
    }

    console.log('🏗️  Building path payment transaction:');
    console.log('  📤 Send (exact):', actualSendAmount.toFixed(7), route.sendAsset.code);
    console.log('  📥 Receive (expected):', expectedReceive.toFixed(7), route.destAsset.code);
    console.log('  ⚠️  Min receive (25% safety):', destMin, route.destAsset.code);
    console.log('  📊 Effective rate:', (expectedReceive / actualSendAmount).toFixed(6));
    console.log('  🎯 Route ID:', route.routeId);
    console.log('  📍 Destination:', destination);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset,
          sendAmount: actualSendAmount.toFixed(7),
          destination,
          destAsset,
          destMin,
          path: [], // Let Stellar find the path automatically via DEX
        })
      )
      .addMemo(Memo.text(`FXShop:${route.routeId.substring(0, 20)}`))
      .setTimeout(180) // 3 minute timeout
      .build();

    // Return XDR for signing
    const xdr = transaction.toXDR();
    console.log('✅ Transaction built successfully');

    return xdr;

  } catch (error: unknown) {
    console.error('Error building transaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to build transaction: ${errorMessage}`);
  }
}

/**
 * Submit a signed transaction to Horizon
 *
 * @param signedXDR - Signed transaction XDR from Freighter
 * @returns Transaction result with hash and ledger
 */
export async function submitTransaction(
  signedXDR: string
): Promise<{
  success: boolean;
  hash: string;
  ledger: number;
  explorerUrl: string;
}> {
  try {
    const server = new Server(HORIZON_URL);
    const transaction = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);

    console.log('Submitting transaction to Horizon...');

    const result = await server.submitTransaction(transaction);

    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${result.hash}`;

    console.log('✅ Transaction submitted successfully');
    console.log('  Hash:', result.hash);
    console.log('  Ledger:', result.ledger);
    console.log('  Explorer:', explorerUrl);

    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
      explorerUrl,
    };

  } catch (error: unknown) {
    console.error('Error submitting transaction:', error);

    // Parse Horizon error
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for Horizon-specific error structure
      const horizonError = error as Error & {
        response?: {
          data?: {
            extras?: {
              result_codes?: {
                transaction: string;
                operations?: string[];
              };
            };
          };
        };
      };
      
      if (horizonError.response?.data?.extras?.result_codes) {
        const codes = horizonError.response.data.extras.result_codes;
        errorMessage = `Transaction failed: ${codes.transaction} (${codes.operations?.join(', ') || 'no operation details'})`;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Check if user has trustline for an asset
 *
 * @param publicKey - User's Stellar public key
 * @param asset - Asset to check trustline for
 * @returns true if trustline exists, false otherwise
 */
export async function hasTrustline(
  publicKey: string,
  asset: { code: string; issuer?: string }
): Promise<boolean> {
  try {
    if (!asset.issuer) {
      return true; // Native XLM doesn't need trustline
    }

    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(publicKey);

    interface AssetBalance {
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
      balance: string;
    }

    const balance = account.balances.find(
      (b: AssetBalance) =>
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
 * Get account balance for an asset
 *
 * @param publicKey - User's Stellar public key
 * @param asset - Asset to get balance for
 * @returns Balance as string, or '0' if not found
 */
export async function getBalance(
  publicKey: string,
  asset: { code: string; issuer?: string }
): Promise<string> {
  try {
    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(publicKey);

    interface AssetBalance {
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
      balance: string;
    }

    if (!asset.issuer) {
      // Native XLM
      const xlmBalance = account.balances.find((b: AssetBalance) => b.asset_type === 'native');
      return xlmBalance?.balance || '0';
    }

    const balance = account.balances.find(
      (b: AssetBalance) =>
        b.asset_code === asset.code &&
        b.asset_issuer === asset.issuer
    );

    return balance?.balance || '0';

  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}
