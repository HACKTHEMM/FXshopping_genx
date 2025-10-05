#!/usr/bin/env node

/**
 * Soroban Contract Deployment Script
 * 
 * This script deploys the PaymentRulesContract to Stellar testnet
 * and provides instructions for mainnet deployment.
 */

const { Server, Networks, Keypair, TransactionBuilder, Operation, BASE_FEE } = require('@stellar/stellar-sdk');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const HORIZON_URL = NETWORK === 'testnet' 
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon-mainnet.stellar.org';
const NETWORK_PASSPHRASE = NETWORK === 'testnet'
  ? Networks.TESTNET
  : Networks.PUBLIC;

// Contract configuration
const CONTRACT_CONFIG = {
  name: 'PaymentRulesContract',
  version: '1.0.0',
  description: 'Smart contract for enforcing payment rules and escrow functionality',
  wasmPath: path.join(__dirname, '../target/wasm32-unknown-unknown/release/payment_rules.wasm'),
  sourcePath: path.join(__dirname, '../contracts/payment_rules.rs'),
};

class ContractDeployer {
  constructor() {
    this.server = new Server(HORIZON_URL);
    this.networkPassphrase = NETWORK_PASSPHRASE;
  }

  /**
   * Generate a new keypair for deployment
   */
  generateDeployerKeypair() {
    const keypair = Keypair.random();
    console.log('🔑 Generated new deployer keypair:');
    console.log(`   Public Key: ${keypair.publicKey()}`);
    console.log(`   Secret Key: ${keypair.secret()}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Save the secret key securely!');
    console.log('');
    return keypair;
  }

  /**
   * Fund the deployer account with testnet XLM
   */
  async fundDeployerAccount(publicKey) {
    if (NETWORK === 'mainnet') {
      console.log('⚠️  Mainnet deployment requires manual funding');
      return;
    }

    try {
      console.log('💰 Funding deployer account with testnet XLM...');
      const response = await fetch('https://friendbot.stellar.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addr: publicKey }),
      });

      if (response.ok) {
        console.log('✅ Account funded successfully');
      } else {
        console.log('❌ Failed to fund account:', await response.text());
      }
    } catch (error) {
      console.log('❌ Error funding account:', error.message);
    }
  }

  /**
   * Check if WASM file exists
   */
  checkWasmFile() {
    if (!fs.existsSync(CONTRACT_CONFIG.wasmPath)) {
      console.log('❌ WASM file not found. Please build the contract first:');
      console.log('   cargo build --target wasm32-unknown-unknown --release');
      console.log('');
      console.log('Expected path:', CONTRACT_CONFIG.wasmPath);
      process.exit(1);
    }
  }

  /**
   * Deploy the contract
   */
  async deployContract(deployerKeypair) {
    try {
      console.log('🚀 Deploying contract...');
      
      // Load deployer account
      const deployerAccount = await this.server.loadAccount(deployerKeypair.publicKey());
      
      // Read WASM file
      const wasmBuffer = fs.readFileSync(CONTRACT_CONFIG.wasmPath);
      
      // Create upload contract operation
      const uploadOp = Operation.uploadContractWasm({
        wasm: wasmBuffer,
      });

      // Build transaction
      const transaction = new TransactionBuilder(deployerAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(uploadOp)
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(deployerKeypair);

      // Submit transaction
      const response = await this.server.submitTransaction(transaction);
      
      if (response.successful) {
        console.log('✅ Contract WASM uploaded successfully');
        console.log(`   Transaction Hash: ${response.hash}`);
        
        // Get the contract WASM hash from the response
        const wasmHash = response.resultXdr
          .toXDR('base64')
          .match(/[A-Fa-f0-9]{64}/)?.[0];
        
        if (wasmHash) {
          console.log(`   WASM Hash: ${wasmHash}`);
          return wasmHash;
        }
      } else {
        console.log('❌ Contract upload failed:', response);
        throw new Error('Contract upload failed');
      }
    } catch (error) {
      console.log('❌ Deployment error:', error.message);
      throw error;
    }
  }

  /**
   * Create the contract instance
   */
  async createContractInstance(deployerKeypair, wasmHash) {
    try {
      console.log('🏗️  Creating contract instance...');
      
      // Load deployer account
      const deployerAccount = await this.server.loadAccount(deployerKeypair.publicKey());
      
      // Create create contract operation
      const createOp = Operation.createContract({
        wasmHash: wasmHash,
        address: deployerKeypair.publicKey(),
      });

      // Build transaction
      const transaction = new TransactionBuilder(deployerAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(createOp)
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(deployerKeypair);

      // Submit transaction
      const response = await this.server.submitTransaction(transaction);
      
      if (response.successful) {
        console.log('✅ Contract instance created successfully');
        console.log(`   Transaction Hash: ${response.hash}`);
        
        // Extract contract address from response
        const contractAddress = response.resultXdr
          .toXDR('base64')
          .match(/[A-Fa-f0-9]{56}/)?.[0];
        
        if (contractAddress) {
          console.log(`   Contract Address: ${contractAddress}`);
          return contractAddress;
        }
      } else {
        console.log('❌ Contract creation failed:', response);
        throw new Error('Contract creation failed');
      }
    } catch (error) {
      console.log('❌ Contract creation error:', error.message);
      throw error;
    }
  }

  /**
   * Initialize the contract
   */
  async initializeContract(deployerKeypair, contractAddress) {
    try {
      console.log('🔧 Initializing contract...');
      
      // Load deployer account
      const deployerAccount = await this.server.loadAccount(deployerKeypair.publicKey());
      
      // Create invoke contract operation
      const invokeOp = Operation.invokeContractFunction({
        contract: contractAddress,
        function: 'initialize',
        args: [deployerKeypair.publicKey()], // Admin address
      });

      // Build transaction
      const transaction = new TransactionBuilder(deployerAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(invokeOp)
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(deployerKeypair);

      // Submit transaction
      const response = await this.server.submitTransaction(transaction);
      
      if (response.successful) {
        console.log('✅ Contract initialized successfully');
        console.log(`   Transaction Hash: ${response.hash}`);
        return true;
      } else {
        console.log('❌ Contract initialization failed:', response);
        throw new Error('Contract initialization failed');
      }
    } catch (error) {
      console.log('❌ Contract initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Generate deployment report
   */
  generateDeploymentReport(contractAddress, deployerKeypair) {
    const report = {
      network: NETWORK,
      contract: {
        name: CONTRACT_CONFIG.name,
        version: CONTRACT_CONFIG.version,
        address: contractAddress,
        deployer: deployerKeypair.publicKey(),
        deployedAt: new Date().toISOString(),
      },
      configuration: {
        horizonUrl: HORIZON_URL,
        networkPassphrase: this.networkPassphrase,
      },
      usage: {
        initialize: `soroban invoke --id ${contractAddress} --source-account ${deployerKeypair.publicKey()} -- initialize --admin ${deployerKeypair.publicKey()}`,
        setRule: `soroban invoke --id ${contractAddress} --source-account <SENDER> -- set_payment_rule --sender <SENDER> --rule <RULE_OBJECT>`,
        createEscrow: `soroban invoke --id ${contractAddress} --source-account <SENDER> -- create_escrow --sender <SENDER> --recipient <RECIPIENT> --amount <AMOUNT> --asset <ASSET> --conditions <CONDITIONS>`,
      },
    };

    const reportPath = path.join(__dirname, `../deployment-report-${NETWORK}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('');
    console.log('📋 Deployment Report Generated:');
    console.log(`   File: ${reportPath}`);
    console.log('');
    console.log('🔗 Contract Details:');
    console.log(`   Address: ${contractAddress}`);
    console.log(`   Network: ${NETWORK}`);
    console.log(`   Deployer: ${deployerKeypair.publicKey()}`);
    console.log('');
    console.log('📖 Next Steps:');
    console.log('   1. Save the contract address and deployer key securely');
    console.log('   2. Update your application configuration with the contract address');
    console.log('   3. Test the contract functions using the Soroban CLI');
    console.log('   4. For mainnet deployment, repeat with mainnet configuration');
  }

  /**
   * Main deployment process
   */
  async deploy() {
    try {
      console.log('🚀 Starting Soroban Contract Deployment');
      console.log(`   Network: ${NETWORK}`);
      console.log(`   Horizon: ${HORIZON_URL}`);
      console.log('');

      // Check WASM file
      this.checkWasmFile();

      // Generate deployer keypair
      const deployerKeypair = this.generateDeployerKeypair();

      // Fund account (testnet only)
      await this.fundDeployerAccount(deployerKeypair.publicKey());

      // Wait a moment for funding to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Deploy contract
      const wasmHash = await this.deployContract(deployerKeypair);
      
      // Create contract instance
      const contractAddress = await this.createContractInstance(deployerKeypair, wasmHash);
      
      // Initialize contract
      await this.initializeContract(deployerKeypair, contractAddress);

      // Generate deployment report
      this.generateDeploymentReport(contractAddress, deployerKeypair);

      console.log('');
      console.log('🎉 Deployment completed successfully!');
      
    } catch (error) {
      console.log('');
      console.log('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const deployer = new ContractDeployer();
  deployer.deploy();
}

module.exports = ContractDeployer;
