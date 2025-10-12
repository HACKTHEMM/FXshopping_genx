/**
 * API Route for Smart Contract Deployment
 * Handles automatic deployment of Route Registry contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface DeploymentResult {
  success: boolean;
  contractId?: string;
  error?: string;
  explorerUrl?: string;
}

/**
 * Check if contract is already deployed
 */
function isContractDeployed(): boolean {
  const contractId = process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID;
  return !!contractId && contractId.length > 0;
}

/**
 * Get contract ID from environment or file
 */
function getContractId(): string | null {
  // First check environment variable
  const envContractId = process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID;
  if (envContractId) {
    return envContractId;
  }

  // Check if contract ID is saved in file
  try {
    const contractIdFile = path.join(process.cwd(), '.contract-id');
    if (fs.existsSync(contractIdFile)) {
      const savedContractId = fs.readFileSync(contractIdFile, 'utf8').trim();
      if (savedContractId) {
        return savedContractId;
      }
    }
  } catch (error) {
    console.warn('Could not read contract ID file:', error);
  }

  return null;
}

/**
 * Automatically deploy contract if not already deployed
 */
async function autoDeployContract(): Promise<DeploymentResult> {
  console.log('🚀 Auto-deploying Route Registry contract...');

  // Check if already deployed
  const existingContractId = getContractId();
  if (existingContractId) {
    console.log('✅ Contract already deployed:', existingContractId);
    return {
      success: true,
      contractId: existingContractId,
      explorerUrl: `https://stellar.expert/explorer/testnet/contract/${existingContractId}`
    };
  }

  try {
    // Check if Soroban CLI is available
    try {
      await execAsync('soroban --version');
    } catch (error) {
      return {
        success: false,
        error: 'Soroban CLI not found. Please install it first: cargo install --locked soroban-cli'
      };
    }

    // Check if Rust is available
    try {
      await execAsync('cargo --version');
    } catch (error) {
      return {
        success: false,
        error: 'Rust not found. Please install it first: https://rustup.rs/'
      };
    }

    // Build contract
    console.log('📦 Building contract...');
    const buildResult = await execAsync(
      'cargo build --target wasm32-unknown-unknown --release',
      { cwd: path.join(process.cwd(), 'contracts', 'route-registry') }
    );
    console.log('✅ Contract built successfully');

    // Optimize contract
    console.log('🔧 Optimizing contract...');
    await execAsync(
      'soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm',
      { cwd: path.join(process.cwd(), 'contracts', 'route-registry') }
    );
    console.log('✅ Contract optimized');

    // Deploy contract
    console.log('📡 Deploying to testnet...');
    const deployResult = await execAsync(
      'soroban contract deploy --wasm target/wasm32-unknown-unknown/release/route_registry.optimized.wasm --source-account testnet --network testnet',
      { cwd: path.join(process.cwd(), 'contracts', 'route-registry') }
    );

    const contractId = deployResult.stdout.trim();
    console.log('✅ Contract deployed successfully:', contractId);

    // Save contract ID to file
    const contractIdFile = path.join(process.cwd(), '.contract-id');
    fs.writeFileSync(contractIdFile, contractId);

    // Update environment variable
    process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID = contractId;

    return {
      success: true,
      contractId,
      explorerUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`
    };

  } catch (error: unknown) {
    console.error('❌ Contract deployment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deployment error'
    };
  }
}

/**
 * GET /api/contract/deploy
 * Check deployment status or deploy contract
 */
export async function GET(request: NextRequest) {
  try {
    // Check if contract is already deployed
    if (isContractDeployed()) {
      const contractId = getContractId()!;
      return NextResponse.json({
        success: true,
        contractId,
        explorerUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`,
        status: 'already_deployed'
      });
    }

    // Auto-deploy contract
    const result = await autoDeployContract();
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('❌ Contract deployment API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/contract/deploy
 * Force deploy contract (even if already deployed)
 */
export async function POST(request: NextRequest) {
  try {
    const result = await autoDeployContract();
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('❌ Contract deployment API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
