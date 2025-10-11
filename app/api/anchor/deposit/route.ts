import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Testnet Anchor - Demo Deposit Endpoint
 * Allows users to get test tokens (INRTEST/USDTEST) for demo purposes
 * Simulates anchor deposit flow without real fiat
 */

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

const ISSUER_SECRET = process.env.STELLAR_ISSUER_SECRET;

if (!ISSUER_SECRET) {
  console.error('❌ STELLAR_ISSUER_SECRET not set in environment');
}

const TEST_ASSETS = [
  { code: 'INRTEST', name: 'Indian Rupee (Test)' },
  { code: 'USDTEST', name: 'US Dollar (Test)' },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPublicKey, assetCode, amount } = body;

    // Validate inputs
    if (!userPublicKey || !assetCode || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userPublicKey, assetCode, amount' },
        { status: 400 }
      );
    }

    if (!ISSUER_SECRET) {
      return NextResponse.json(
        { error: 'Anchor not configured. Please set STELLAR_ISSUER_SECRET.' },
        { status: 500 }
      );
    }

    // Validate asset code
    const validAsset = TEST_ASSETS.find(a => a.code === assetCode);
    if (!validAsset) {
      return NextResponse.json(
        { error: `Invalid asset code. Supported: ${TEST_ASSETS.map(a => a.code).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0 || depositAmount > 100000) {
      return NextResponse.json(
        { error: 'Amount must be between 0 and 100,000' },
        { status: 400 }
      );
    }

    const server = new StellarSdk.Horizon.Server(HORIZON_URL);
    const issuerKeypair = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
    const issuerPublic = issuerKeypair.publicKey();

    console.log(`📥 Anchor deposit request: ${depositAmount} ${assetCode} → ${userPublicKey}`);

    // Load user account
    let userAccount;
    try {
      userAccount = await server.loadAccount(userPublicKey);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'User account not found. Please fund account with XLM via Friendbot first.' },
        { status: 404 }
      );
    }

    // Check if user has trustline for this asset
    const hasTrustline = userAccount.balances.some(
      (balance: any) =>
        balance.asset_code === assetCode &&
        balance.asset_issuer === issuerPublic
    );

    if (!hasTrustline) {
      return NextResponse.json(
        {
          error: 'Trustline not established',
          message: `You need to add a trustline for ${assetCode} first.`,
          assetCode,
          issuer: issuerPublic,
          needsTrustline: true,
        },
        { status: 400 }
      );
    }

    // Load issuer account
    const issuerAccount = await server.loadAccount(issuerPublic);

    // Create asset
    const asset = new StellarSdk.Asset(assetCode, issuerPublic);

    // Build payment transaction
    const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: userPublicKey,
          asset: asset,
          amount: depositAmount.toFixed(7),
        })
      )
      .addMemo(StellarSdk.Memo.text(`Demo deposit: ${assetCode}`))
      .setTimeout(180)
      .build();

    // Sign and submit
    transaction.sign(issuerKeypair);
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Deposited ${depositAmount} ${assetCode} to ${userPublicKey}`);

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      amount: depositAmount,
      assetCode,
      assetName: validAsset.name,
      userPublicKey,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      message: `Successfully deposited ${depositAmount} ${assetCode} to your account`,
    });

  } catch (error: any) {
    console.error('❌ Anchor deposit error:', error);

    // Check for specific error types
    if (error.response?.data?.extras?.result_codes) {
      const resultCodes = error.response.data.extras.result_codes;
      console.error('Transaction result codes:', resultCodes);

      // Insufficient balance
      if (resultCodes.operations?.includes('op_underfunded')) {
        return NextResponse.json(
          { error: 'Anchor has insufficient balance. Please contact support.' },
          { status: 500 }
        );
      }

      // Trustline issue
      if (resultCodes.operations?.includes('op_no_trust')) {
        return NextResponse.json(
          { error: 'Trustline not found. Please add trustline first.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Deposit failed',
        message: error.message || 'Unknown error',
        details: error.response?.data?.extras?.result_codes,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check anchor info
export async function GET(request: NextRequest) {
  try {
    if (!ISSUER_SECRET) {
      return NextResponse.json(
        { error: 'Anchor not configured' },
        { status: 500 }
      );
    }

    const issuerKeypair = StellarSdk.Keypair.fromSecret(ISSUER_SECRET);
    const issuerPublic = issuerKeypair.publicKey();

    return NextResponse.json({
      success: true,
      anchor: {
        name: 'LumenFX Testnet Anchor',
        description: 'Demo anchor for testing INR/USD token deposits',
        issuer: issuerPublic,
        assets: TEST_ASSETS,
        network: 'testnet',
        maxDepositAmount: 100000,
      },
    });

  } catch (error: any) {
    console.error('❌ Anchor info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anchor info', message: error.message },
      { status: 500 }
    );
  }
}
