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

    // Calculate minimum destination amount with reasonable slippage tolerance
    // Use onChainReceive if available (amount before withdrawal), otherwise use netReceive
    // This fixes the unit mismatch where netReceive may be in fiat but we need token amount

    // Calculate slippage based on direction and liquidity
    const isUsdToInr = route.sendAsset.code.includes('USD') && route.destAsset.code.includes('INR');

    // Use conservative slippage for testnet due to liquidity issues
    // For production, this should be 1-2% max
    const slippageTolerance = isUsdToInr ? 0.10 : 0.05; // 10% for USD→INR, 5% for others

    // Use the effective rate from the route for consistent execution
    const expectedReceive = route.onChainReceive || route.netReceive;

    // Apply aggressive slippage for destMin to prevent failures
    // The actual amount received will likely be much better than this minimum
    const destMin = (expectedReceive * (1 - slippageTolerance)).toFixed(7);

    console.log('🏗️  Building path payment transaction:');
    console.log('  📤 Send (exact):', route.grossSend, route.sendAsset.code);
    console.log('  📥 Receive (expected):', expectedReceive, route.destAsset.code);
    console.log('  ⚠️  Min receive (with', (slippageTolerance * 100) + '% safety):', destMin, route.destAsset.code);
    console.log('  📊 Effective rate:', route.effectiveRate.toFixed(6));
    if (route.onChainReceive) {
      console.log('  💰 onChainReceive from quote:', route.onChainReceive, route.destAsset.code);
    }
    console.log('  📍 Destination:', destination);

    // Build explicit path to ensure we get the market rate
    // Instead of letting Stellar auto-select based on liquidity
    const explicitPath: Asset[] = [];
    
    // For direct swaps (USDTEST → INRTEST), enforce market rate by setting high destMin
    // This prevents Stellar from using worse rates due to high liquidity
    if (route.sendAsset.code === 'USDTEST' && route.destAsset.code === 'INRTEST') {
      // Calculate expected receive at market rate
      const marketRateReceive = route.grossSend * route.effectiveRate;
      
      // Set destMin to 90% of market rate to force Stellar to find better offers
      // This prevents execution at the 83.5 rate due to high liquidity
      const destMinMarketRate = (marketRateReceive * 0.90).toFixed(7); // 10% slippage from market rate
      
      console.log('  🎯 Market rate enforcement for USDTEST→INRTEST:');
      console.log('    Market rate:', route.effectiveRate);
      console.log('    Expected at market rate:', marketRateReceive.toFixed(2), route.destAsset.code);
      console.log('    Min acceptable (10% slippage):', destMinMarketRate, route.destAsset.code);
      console.log('    This prevents execution at worse rates (e.g., 83.5)');
      
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
            destMin: destMinMarketRate, // Force better rates
            path: explicitPath, // Empty path for direct trade
          })
        )
        .addMemo(Memo.text(`FXShop:${route.routeId.substring(0, 20)}`))
        .setTimeout(180) // 3 minute timeout
        .build();

      const xdr = transaction.toXDR();
      console.log('✅ Transaction built with market rate enforcement');
      return xdr;
    } else {
      // For other pairs, use original logic
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
            path: explicitPath, // Empty path for direct trade
          })
        )
        .addMemo(Memo.text(`FXShop:${route.routeId.substring(0, 20)}`))
        .setTimeout(180) // 3 minute timeout
        .build();

      const xdr = transaction.toXDR();
      console.log('✅ Transaction built successfully');
      return xdr;
    }

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
