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

    // Calculate minimum destination amount with higher slippage tolerance for testnet liquidity
    // Use onChainReceive if available (amount before withdrawal), otherwise use netReceive
    // This fixes the unit mismatch where netReceive may be in fiat but we need token amount

    // Use higher slippage for USD → INR due to poor liquidity in that direction
    const isUsdToInr = route.sendAsset.code.includes('USD') && route.destAsset.code.includes('INR');
    const slippageTolerance = isUsdToInr ? 0.20 : 0.10; // 20% for USD→INR, 10% for others

    const expectedReceive = route.onChainReceive || route.netReceive;
    // Apply slippage and truncate (not round) for more conservative estimate
    const destMinRaw = expectedReceive * (1 - slippageTolerance);
    // Truncate to 6 decimal places to avoid rounding issues
    const destMin = (Math.floor(destMinRaw * 1000000) / 1000000).toFixed(7);

    console.log('🏗️  Building path payment transaction:');
    console.log('  📤 Send:', route.grossSend, route.sendAsset.code);
    console.log('  📥 Receive (on-chain expected):', expectedReceive, route.destAsset.code);
    console.log('  ⚠️  Receive (min with', (slippageTolerance * 100) + '% slippage):', destMin, route.destAsset.code);
    console.log('  🎯 onChainReceive available:', !!route.onChainReceive);
    console.log('  📊 netReceive:', route.netReceive);
    if (route.onChainReceive) {
      console.log('  💰 onChainReceive:', route.onChainReceive, route.destAsset.code);
    }
    if (route.onChainReceive && route.netReceive !== route.onChainReceive) {
      console.log('  🏦 Final amount after withdrawal:', route.netReceive, route.destinationFiat || 'fiat');
    }
    console.log('  📍 Destination:', destination);

    // Build transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset,
          sendAmount: route.grossSend.toFixed(7),
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

  } catch (error: any) {
    console.error('Error building transaction:', error);
    throw new Error(`Failed to build transaction: ${error.message}`);
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

  } catch (error: any) {
    console.error('Error submitting transaction:', error);

    // Parse Horizon error
    let errorMessage = error.message;
    if (error.response?.data?.extras?.result_codes) {
      const codes = error.response.data.extras.result_codes;
      errorMessage = `Transaction failed: ${codes.transaction} (${codes.operations?.join(', ')})`;
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

    if (!asset.issuer) {
      // Native XLM
      const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');
      return xlmBalance?.balance || '0';
    }

    const balance = account.balances.find(
      (b: any) =>
        b.asset_code === asset.code &&
        b.asset_issuer === asset.issuer
    );

    return balance?.balance || '0';

  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}
