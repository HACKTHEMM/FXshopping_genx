import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Testnet Anchor - Balance Check Endpoint
 * Checks user's account status, trustlines, and balances
 */

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const ISSUER_SECRET = process.env.STELLAR_ISSUER_SECRET;

if (!ISSUER_SECRET) {
  console.error('❌ STELLAR_ISSUER_SECRET not set in environment');
}

const TEST_ASSETS = ['INRTEST', 'USDTEST'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userPublicKey = searchParams.get('publicKey');

    if (!userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameter: publicKey' },
        { status: 400 }
      );
    }

    if (!ISSUER_SECRET) {
      return NextResponse.json(
        { error: 'Anchor not configured' },
        { status: 500 }
      );
    }

    const issuerKeypair = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
    const issuerPublic = issuerKeypair.publicKey();

    const server = new StellarSdk.Horizon.Server(HORIZON_URL);

    // Load user account
    let userAccount;
    try {
      userAccount = await server.loadAccount(userPublicKey);
    } catch (error: any) {
      // Account not found
      if (error.response?.status === 404) {
        return NextResponse.json({
          success: false,
          accountExists: false,
          message: 'Account not found on Stellar testnet. Please fund via Friendbot first.',
          friendbotUrl: `https://friendbot.stellar.org?addr=${userPublicKey}`,
        });
      }
      throw error;
    }

    // Check trustlines and balances for our test assets
    const assetStatus = TEST_ASSETS.map(assetCode => {
      const balance = userAccount.balances.find(
        (b: any) =>
          b.asset_code === assetCode &&
          b.asset_issuer === issuerPublic
      );

      return {
        assetCode,
        issuer: issuerPublic,
        hasTrustline: !!balance,
        balance: balance ? parseFloat(balance.balance) : 0,
        limit: balance && 'limit' in balance ? balance.limit : '0',
      };
    });

    // Check XLM balance
    const xlmBalance = userAccount.balances.find(
      (b: any) => b.asset_type === 'native'
    );

    const xlmBalanceValue = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
    const hasAllTrustlines = assetStatus.every(a => a.hasTrustline);
    const needsFunding = assetStatus.every(a => a.balance === 0);

    // Check if account needs more XLM (less than 2 XLM is considered too low for operations)
    const needsXlmFunding = xlmBalanceValue < 2;

    // If account exists but has insufficient XLM, suggest friendbot
    if (needsXlmFunding) {
      return NextResponse.json({
        success: true,
        accountExists: true,
        needsXlmFunding: true,
        userPublicKey,
        xlmBalance: xlmBalanceValue,
        assets: assetStatus,
        status: {
          hasAllTrustlines,
          needsFunding,
          readyForDemo: hasAllTrustlines && !needsFunding && !needsXlmFunding,
        },
        message: `Account has insufficient XLM (${xlmBalanceValue.toFixed(2)} XLM). Need at least 2 XLM for operations. Please fund via Friendbot.`,
        friendbotUrl: `https://friendbot.stellar.org?addr=${userPublicKey}`,
      });
    }

    return NextResponse.json({
      success: true,
      accountExists: true,
      userPublicKey,
      xlmBalance: xlmBalanceValue,
      assets: assetStatus,
      status: {
        hasAllTrustlines,
        needsFunding,
        readyForDemo: hasAllTrustlines && !needsFunding,
      },
      message: hasAllTrustlines
        ? needsFunding
          ? 'Trustlines established. Ready to request demo tokens.'
          : 'Account ready! You have test tokens.'
        : 'No trustlines found. Please add trustlines first.',
    });

  } catch (error: any) {
    console.error('❌ Balance check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check balance',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
