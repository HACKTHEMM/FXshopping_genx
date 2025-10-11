import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractType, requirements } = body;

    if (!contractType || !requirements) {
      return NextResponse.json(
        { error: 'Missing contractType or requirements' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured. Please add it to your .env.local file.' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Generate a complete Soroban smart contract for Stellar blockchain with the following specifications:

Contract Type: ${contractType}
Requirements: ${requirements}

CRITICAL REQUIREMENTS - Follow these EXACTLY:

1. **Imports**: Use ONLY these imports from soroban_sdk:
   - #![no_std]
   - use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env};
   - Add token module only if needed: use soroban_sdk::token;
   - DO NOT import: Into, IntoVal, Val, Symbol (these are not needed)

2. **Contract Structure**:
   - Use #[contract] macro for the struct definition
   - Use #[contractimpl] macro for the implementation
   - Use #[contracttype] for custom data structures
   - Use #[contracterror] for error enums with #[repr(u32)]

3. **Error Handling**:
   - Define errors with #[contracterror] macro
   - Error enum should derive: Clone, Debug, Copy, Eq, PartialEq
   - Use #[repr(u32)] for error codes
   - DO NOT implement IntoVal manually - the macro handles this

4. **Storage API** (SDK v22.0.8):
   - Use env.storage().persistent().extend_ttl() instead of bump()
   - Format: .extend_ttl(&key, threshold, lifetime)

5. **Best Practices**:
   - Include proper documentation comments
   - Use require_auth() for authorization
   - Handle edge cases and validation
   - Use meaningful error messages

EXAMPLE TEMPLATE:
\`\`\`rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env};

#[contracterror]
#[derive(Clone, Debug, Copy, Eq, PartialEq)]
#[repr(u32)]
pub enum MyError {
    AlreadyInitialized = 1,
    Unauthorized = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MyData {
    pub owner: Address,
    pub value: i128,
}

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn initialize(env: Env, owner: Address) -> Result<(), MyError> {
        // Implementation
        Ok(())
    }
}
\`\`\`

Return ONLY the Rust code without any markdown formatting or explanations. The code should be ready to save as lib.rs and compile directly with soroban-sdk v22.0.8.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let contractCode = response.text();

    // Clean up markdown code blocks if present
    contractCode = contractCode.replace(/```rust\n?/g, '').replace(/```\n?/g, '').trim();

    return NextResponse.json({
      success: true,
      contractCode,
      contractType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contract generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate contract';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
