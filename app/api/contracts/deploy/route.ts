import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Platform-agnostic command execution
async function execCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'powershell.exe' : '/bin/bash';
  
  return execAsync(command, {
    shell,
    cwd,
    env: process.env
  });
}

// Check if wasm32 target is installed
async function checkWasm32Target(): Promise<boolean> {
  try {
    const { stdout } = await execCommand('rustup target list --installed');
    return stdout.includes('wasm32-unknown-unknown');
  } catch {
    return false;
  }
}

// Install wasm32 target if missing
async function ensureWasm32Target(): Promise<void> {
  const isInstalled = await checkWasm32Target();
  
  if (!isInstalled) {
    console.log('wasm32-unknown-unknown target not found. Installing...');
    await execCommand('rustup target add wasm32-unknown-unknown');
    console.log('wasm32-unknown-unknown target installed successfully');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractCode, contractName } = body;

    if (!contractCode || !contractName) {
      return NextResponse.json(
        { error: 'Missing contractCode or contractName' },
        { status: 400 }
      );
    }

    // Sanitize contract name
    const safeName = contractName.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const contractDir = path.join(process.cwd(), 'contracts', safeName);
    const srcDir = path.join(contractDir, 'src');

    // Create contract directory structure
    mkdirSync(srcDir, { recursive: true });

    // Write Cargo.toml
    const cargoToml = `[package]
name = "${safeName}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = "22.0.8"

[dev-dependencies]
soroban-sdk = { version = "22.0.8", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
`;

    writeFileSync(path.join(contractDir, 'Cargo.toml'), cargoToml);
    writeFileSync(path.join(srcDir, 'lib.rs'), contractCode);

    // Build the contract (platform-agnostic)
    try {
      // Ensure wasm32 target is installed
      try {
        await ensureWasm32Target();
      } catch (targetError) {
        console.error('Failed to install wasm32 target:', targetError);
        return NextResponse.json(
          {
            error: 'wasm32-unknown-unknown target is required but could not be installed',
            details: 'Please install it manually by running: rustup target add wasm32-unknown-unknown',
            helpUrl: 'https://soroban.stellar.org/docs/getting-started/setup'
          },
          { status: 500 }
        );
      }
      
      console.log(`Building contract in: ${contractDir}`);
      
      const { stdout: buildOutput } = await execCommand(
        'cargo build --target wasm32-unknown-unknown --release',
        contractDir
      );

      const wasmPath = path.join(contractDir, 'target', 'wasm32-unknown-unknown', 'release', `${safeName}.wasm`);
      
      // Try to optimize the WASM, but fall back to unoptimized if it fails
      let wasmToDeployPath = wasmPath;
      let optimizationNote = '';
      
      try {
        console.log(`Attempting to optimize WASM at: ${wasmPath}`);
        
        // Try method 1: Use stellar contract optimize with bulk memory flag
        try {
          await execCommand(
            `stellar contract optimize --wasm "${wasmPath}" --wasm-out "${wasmPath.replace('.wasm', '.optimized.wasm')}"`
          );
          wasmToDeployPath = wasmPath.replace('.wasm', '.optimized.wasm');
          optimizationNote = '✓ Optimized with Stellar CLI';
          console.log(`Successfully optimized with stellar CLI`);
        } catch {
          console.log('Stellar CLI optimization not available, trying wasm-opt...');
          
          // Try method 2: Use wasm-opt directly
          await execCommand(
            `wasm-opt "${wasmPath}" -O3 --enable-bulk-memory -o "${wasmPath.replace('.wasm', '.optimized.wasm')}"`
          );
          wasmToDeployPath = wasmPath.replace('.wasm', '.optimized.wasm');
          optimizationNote = '✓ Optimized with wasm-opt';
          console.log(`Successfully optimized with wasm-opt`);
        }
        
      } catch {
        console.log('⚠️  Optimization tools not available - deploying unoptimized WASM (this is OK for development)');
        optimizationNote = '⚠️  Deployed unoptimized - works fine for testing! Install wasm-opt or stellar CLI for optimized builds.';
        // Continue with unoptimized WASM - it will work fine for testing
      }

      // Deploy to testnet
      console.log(`Deploying contract from: ${wasmToDeployPath}`);
      
      const { stdout: deployOutput } = await execCommand(
        `stellar contract deploy --wasm "${wasmToDeployPath}" --network testnet --source-account testnet`
      );

      const contractId = deployOutput.trim();

      return NextResponse.json({
        success: true,
        contractId,
        contractName: safeName,
        network: 'testnet',
        message: 'Contract compiled and deployed successfully',
        optimizationStatus: optimizationNote,
        buildOutput: buildOutput.substring(0, 500),
        timestamp: new Date().toISOString()
      });

    } catch (buildError) {
      console.error('Build/Deploy error:', buildError);
      const errorMessage = buildError instanceof Error ? buildError.message : 'Unknown build error';
      const stderr = (buildError as { stderr?: string }).stderr;
      return NextResponse.json(
        {
          error: 'Build or deployment failed',
          details: stderr || errorMessage,
          contractDir
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Contract deployment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deploy contract' },
      { status: 500 }
    );
  }
}
