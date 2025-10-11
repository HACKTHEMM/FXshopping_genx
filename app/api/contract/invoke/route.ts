import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json();
    
    console.log(`🔧 Contract invocation: ${method}`);
    console.log(`   Params:`, params);

    const contractId = process.env.NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID;
    if (!contractId) {
      return NextResponse.json({
        success: false,
        error: 'Contract not deployed'
      }, { status: 400 });
    }

    // Build the soroban contract invoke command
    let command = `soroban contract invoke --id ${contractId} --network testnet`;
    
    // Add method and parameters
    command += ` -- ${method}`;
    
    if (params && params.length > 0) {
      params.forEach((param: unknown) => {
        if (typeof param === 'string') {
          command += ` --arg "${param}"`;
        } else if (typeof param === 'number') {
          command += ` --arg ${param}`;
        } else if (param && typeof param === 'object') {
          // Handle complex types like BytesN, Address, etc.
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

    console.log(`   Command: ${command}`);

    // Execute the contract invocation
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('warning')) {
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
