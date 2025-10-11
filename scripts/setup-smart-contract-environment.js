/**
 * Setup Smart Contract Environment
 * Automatically installs dependencies and deploys contract
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function checkCommand(command, installCommand) {
  try {
    await execAsync(`${command} --version`);
    console.log(`✅ ${command} is installed`);
    return true;
  } catch (error) {
    console.log(`❌ ${command} not found`);
    console.log(`   Install with: ${installCommand}`);
    return false;
  }
}

async function installRust() {
  console.log('🦀 Installing Rust...');
  try {
    // Check if we're on Windows
    if (process.platform === 'win32') {
      await execAsync('winget install Rustlang.Rust.MSVC');
    } else {
      await execAsync('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y');
    }
    console.log('✅ Rust installed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to install Rust:', error.message);
    return false;
  }
}

async function installSorobanCLI() {
  console.log('📦 Installing Soroban CLI...');
  try {
    await execAsync('cargo install --locked soroban-cli');
    console.log('✅ Soroban CLI installed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to install Soroban CLI:', error.message);
    return false;
  }
}

async function configureSoroban() {
  console.log('⚙️ Configuring Soroban for testnet...');
  try {
    await execAsync('soroban config network add testnet --rpc-url https://soroban-testnet.stellar.org:443 --network-passphrase "Test SDF Network ; September 2015"');
    console.log('✅ Soroban configured for testnet');
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Soroban:', error.message);
    return false;
  }
}

async function generateTestnetAccount() {
  console.log('🔑 Generating testnet account...');
  try {
    const result = await execAsync('soroban keys generate --global testnet --network testnet');
    console.log('✅ Testnet account generated');
    console.log('   Account details:', result.stdout);
    return true;
  } catch (error) {
    console.error('❌ Failed to generate testnet account:', error.message);
    return false;
  }
}

async function fundTestnetAccount() {
  console.log('💰 Funding testnet account...');
  try {
    // Get the public key from the generated account
    const keyResult = await execAsync('soroban keys show testnet --network testnet');
    const publicKey = keyResult.stdout.split('\n')[0].trim();
    
    // Fund with friendbot
    const fundResult = await execAsync(`curl "https://friendbot.stellar.org/?addr=${publicKey}"`);
    console.log('✅ Testnet account funded');
    console.log('   Public key:', publicKey);
    return true;
  } catch (error) {
    console.error('❌ Failed to fund testnet account:', error.message);
    return false;
  }
}

async function deployContract() {
  console.log('🚀 Deploying Route Registry contract...');
  try {
    // Build contract
    console.log('📦 Building contract...');
    await execAsync('cargo build --target wasm32-unknown-unknown --release', {
      cwd: path.join(process.cwd(), 'contracts', 'route-registry')
    });

    // Optimize contract
    console.log('🔧 Optimizing contract...');
    await execAsync('soroban contract optimize --wasm target/wasm32-unknown-unknown/release/route_registry.wasm', {
      cwd: path.join(process.cwd(), 'contracts', 'route-registry')
    });

    // Deploy contract
    console.log('📡 Deploying to testnet...');
    const deployResult = await execAsync('soroban contract deploy --wasm target/wasm32-unknown-unknown/release/route_registry.optimized.wasm --source-account testnet --network testnet', {
      cwd: path.join(process.cwd(), 'contracts', 'route-registry')
    });

    const contractId = deployResult.stdout.trim();
    console.log('✅ Contract deployed successfully');
    console.log('   Contract ID:', contractId);
    console.log('   Explorer:', `https://testnet.steexp.com/contract/${contractId}`);

    // Save contract ID
    fs.writeFileSync(path.join(process.cwd(), '.contract-id'), contractId);
    
    // Update .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Add or update contract ID
    if (envContent.includes('NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=.*/,
        `NEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=${contractId}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_ROUTE_REGISTRY_CONTRACT_ID=${contractId}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment variables updated');

    return contractId;
  } catch (error) {
    console.error('❌ Failed to deploy contract:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Setting up Smart Contract Environment...\n');

  // Check prerequisites
  const hasRust = await checkCommand('rustc', 'https://rustup.rs/');
  const hasCargo = await checkCommand('cargo', 'https://rustup.rs/');
  const hasSoroban = await checkCommand('soroban', 'cargo install --locked soroban-cli');

  // Install Rust if needed
  if (!hasRust || !hasCargo) {
    const rustInstalled = await installRust();
    if (!rustInstalled) {
      console.error('❌ Failed to install Rust. Please install manually.');
      process.exit(1);
    }
  }

  // Install Soroban CLI if needed
  if (!hasSoroban) {
    const sorobanInstalled = await installSorobanCLI();
    if (!sorobanInstalled) {
      console.error('❌ Failed to install Soroban CLI. Please install manually.');
      process.exit(1);
    }
  }

  // Configure Soroban
  await configureSoroban();

  // Generate and fund testnet account
  await generateTestnetAccount();
  await fundTestnetAccount();

  // Deploy contract
  const contractId = await deployContract();
  if (!contractId) {
    console.error('❌ Failed to deploy contract');
    process.exit(1);
  }

  console.log('\n🎉 Smart Contract Environment Setup Complete!');
  console.log('📋 Summary:');
  console.log(`   Contract ID: ${contractId}`);
  console.log(`   Explorer: https://testnet.steexp.com/contract/${contractId}`);
  console.log('   Environment: Updated .env.local');
  console.log('\n💡 You can now use the app with automated smart contract deployment!');
}

main().catch(console.error);
