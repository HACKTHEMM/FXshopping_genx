import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json();
    
    console.log(`🔧 Contract invocation: ${method}`);
    console.log(`   Params:`, params);

    // Server-side API routes can access both regular and NEXT_PUBLIC_ env vars
    // Try both for compatibility
    const contractId = process.env.ROUTE_REGISTRY_CONTRACT_ID || process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID;
    console.log(`   Contract ID: ${contractId}`);
    if (!contractId) {
      console.error('❌ Contract ID not found in environment');
      console.error('   ROUTE_REGISTRY_CONTRACT_ID:', process.env.ROUTE_REGISTRY_CONTRACT_ID);
      console.error('   NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID:', process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID);
      return NextResponse.json({
        success: false,
        error: 'Contract not deployed'
      }, { status: 400 });
    }

    // Build the soroban contract invoke command
    let command = `soroban contract invoke --id ${contractId} --network testnet --source-account ${process.env.STELLAR_ISSUER_SECRET}`;
    
    // Add method and parameters based on the method
    if (method === 'register_route') {
      command += ` -- register_route`;
      if (params && params.length >= 3) {
        command += ` --route_id "${params[0]}"`;
        command += ` --expected_net ${params[1]}`;
        // Use issuer secret key as sender to avoid auth issues
        const issuerSecretKey = process.env.STELLAR_ISSUER_SECRET;
        command += ` --sender "${issuerSecretKey}"`;
      }
    } else if (method === 'finalize_route') {
      command += ` -- finalize_route`;
      if (params && params.length >= 3) {
        command += ` --route_id "${params[0]}"`;
        command += ` --tx_hash "${params[1]}"`;
        command += ` --actual_net ${params[2]}`;
      }
    } else if (method === 'get_route') {
      command += ` -- get_route`;
      if (params && params.length >= 1) {
        command += ` --route_id "${params[0]}"`;
      }
    } else {
      // Generic method handling
      command += ` -- ${method}`;
      if (params && params.length > 0) {
        params.forEach((param: unknown) => {
          if (typeof param === 'string') {
            command += ` --arg "${param}"`;
          } else if (typeof param === 'number') {
            command += ` --arg ${param}`;
          } else if (param && typeof param === 'object') {
            const paramObj = param as { type: string; value: string };
            if (paramObj.type === 'bytes32') {
              command += ` --arg "${paramObj.value}"`;
            } else if (paramObj.type === 'address') {
              command += ` --arg "${paramObj.value}"`;
            } else {
              command += ` --arg "${JSON.stringify(param)}"`;
            }
          }
        });
      }
    }

    console.log(`   Command: ${command}`);

    // Execute the contract invocation
    let stdout: string;
    let stderr: string;

    try {
      const result = await execAsync(command);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: unknown) {
      // execAsync throws when the command exits with non-zero status
      const error = execError as { stdout?: string; stderr?: string; code?: number };
      console.error('❌ Command execution failed with non-zero exit code');
      console.error('   Exit code:', error.code);
      console.error('   stdout:', error.stdout);
      console.error('   stderr:', error.stderr);

      return NextResponse.json({
        success: false,
        error: error.stderr || error.stdout || 'Command execution failed'
      }, { status: 500 });
    }

    console.log(`   stdout:`, stdout);
    if (stderr) {
      console.log(`   stderr:`, stderr);
    }

    // Soroban CLI often writes informational messages to stderr even on success
    // Only treat it as an error if there's an explicit error message
    // or if stdout is empty (indicating the command truly failed)
    const hasError = stderr && (
      stderr.toLowerCase().includes('error:') ||
      stderr.toLowerCase().includes('failed') ||
      stderr.toLowerCase().includes('invalid')
    );

    if (hasError) {
      console.error('❌ Contract invocation error:', stderr);
      return NextResponse.json({
        success: false,
        error: stderr
      }, { status: 500 });
    }

    console.log(`   ✅ Contract invocation successful:`, stdout);

    return NextResponse.json({
      success: true,
      result: stdout.trim()
    });

  } catch (error: unknown) {
    console.error('❌ Contract invocation failed:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message || 'Contract invocation failed'
    }, { status: 500 });
  }
}
