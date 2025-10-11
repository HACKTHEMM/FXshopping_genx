/**
 * Stellar Account Activation Utilities
 *
 * Handles checking if accounts exist and helping users activate them
 */

import { Horizon } from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const { Server } = Horizon;

export interface AccountStatus {
  exists: boolean;
  activated: boolean;
  balance?: string;
  address: string;
}

/**
 * Check if a Stellar account exists and is activated
 *
 * @param publicKey - Stellar public key to check
 * @returns Account status information
 */
export async function checkAccountStatus(publicKey: string): Promise<AccountStatus> {
  try {
    console.log('🔍 Checking account status for:', publicKey.substring(0, 8) + '...');
    const server = new Server(HORIZON_URL);

    // Try to load the account
    const account = await server.loadAccount(publicKey);

    // Account exists! Get XLM balance
    const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');
    const balance = xlmBalance?.balance || '0';

    console.log('✅ Account found on network!');
    console.log('  Balance:', balance, 'XLM');
    console.log('  Sequence:', account.sequence);

    return {
      exists: true,
      activated: true,
      balance,
      address: publicKey,
    };

  } catch (error: any) {
    // Check if it's a "not found" error
    if (error.response?.status === 404 || error.message?.includes('Not Found') || error.message?.includes('not found')) {
      console.log('⚠️ Account not found on testnet:', publicKey.substring(0, 8) + '...');
      console.log('  This account needs to be funded to activate it');
      return {
        exists: false,
        activated: false,
        address: publicKey,
      };
    }

    // Some other error
    console.error('❌ Error checking account:', error);
    console.error('  Error type:', error.constructor.name);
    console.error('  Error message:', error.message);
    console.error('  Response status:', error.response?.status);
    throw error;
  }
}

/**
 * Activate account using Friendbot (testnet only)
 *
 * @param publicKey - Stellar public key to activate
 * @returns Success status and account balance
 */
export async function activateAccountWithFriendbot(publicKey: string): Promise<{
  success: boolean;
  balance: string;
  explorerUrl: string;
}> {
  try {
    console.log('🤖 Activating account with Friendbot...');
    console.log('  Address:', publicKey.substring(0, 8) + '...');

    // Call Friendbot to fund the account
    const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Friendbot failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Account activated successfully!');

    // Wait a moment for the transaction to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check the new balance
    const status = await checkAccountStatus(publicKey);

    const explorerUrl = `https://stellar.expert/explorer/testnet/account/${publicKey}`;

    console.log('  Balance:', status.balance, 'XLM');
    console.log('  Explorer:', explorerUrl);

    return {
      success: true,
      balance: status.balance || '10000',
      explorerUrl,
    };

  } catch (error: any) {
    console.error('❌ Friendbot activation failed:', error);
    throw new Error(`Failed to activate account: ${error.message}`);
  }
}

/**
 * Check account and activate if needed
 *
 * @param publicKey - Stellar public key
 * @returns Account status after activation (if needed)
 */
export async function ensureAccountActivated(publicKey: string): Promise<AccountStatus> {
  try {
    // Check current status
    const status = await checkAccountStatus(publicKey);

    if (status.activated) {
      console.log('✅ Account already activated');
      return status;
    }

    // Account not activated - use Friendbot
    console.log('⚠️ Account not activated. Activating with Friendbot...');
    await activateAccountWithFriendbot(publicKey);

    // Check status again
    return await checkAccountStatus(publicKey);

  } catch (error: any) {
    console.error('Error ensuring account activation:', error);
    throw error;
  }
}

/**
 * Get Friendbot URL for manual activation
 *
 * @param publicKey - Stellar public key
 * @returns Friendbot URL
 */
export function getFriendbotUrl(publicKey: string): string {
  return `${FRIENDBOT_URL}?addr=${publicKey}`;
}

/**
 * Get account explorer URL
 *
 * @param publicKey - Stellar public key
 * @param network - 'testnet' or 'mainnet'
 * @returns Stellar Expert explorer URL
 */
export function getExplorerUrl(publicKey: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/account/${publicKey}`;
}
