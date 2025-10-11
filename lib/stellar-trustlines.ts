/**
 * Stellar Trustline Management
 * Creates trustlines for all supported assets in the Wormhole integration
 */

import { 
  Keypair, 
  TransactionBuilder, 
  Networks, 
  Operation, 
  Asset, 
  BASE_FEE,
  Horizon
} from '@stellar/stellar-sdk';

const { Server } = Horizon;

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

// All assets that need trustlines
const ASSETS_TO_CREATE_TRUSTLINES = [
  // Mainnet USDC
  {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    name: 'USD Coin'
  },
  // Mainnet USDT
  {
    code: 'USDT',
    issuer: 'GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
    name: 'Tether USD'
  },
  // Testnet assets (using the issuer from PaymentForm)
  {
    code: 'INRTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'Indian Rupee Test'
  },
  {
    code: 'USDTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'US Dollar Test'
  },
  {
    code: 'EURTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'Euro Test'
  },
  {
    code: 'PHPTEST',
    issuer: 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    name: 'Philippine Peso Test'
  }
];

/**
 * Create trustlines for all supported assets
 * This function should be called with Freighter wallet connected
 */
export async function createAllTrustlines(userPublicKey: string): Promise<{
  success: boolean;
  results: Array<{
    asset: string;
    success: boolean;
    transactionHash?: string;
    error?: string;
  }>;
}> {
  const results = [];
  
  try {
    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(userPublicKey);
    
    console.log(`🔄 Creating trustlines for ${userPublicKey}...`);
    
    for (const assetConfig of ASSETS_TO_CREATE_TRUSTLINES) {
      try {
        console.log(`📝 Creating trustline for ${assetConfig.code}...`);
        
        const asset = new Asset(assetConfig.code, assetConfig.issuer);
        
        // Check if trustline already exists
        const existingTrustline = account.balances.find(
          (balance: any) => 
            balance.asset_code === assetConfig.code && 
            balance.asset_issuer === assetConfig.issuer
        );
        
        if (existingTrustline) {
          console.log(`✅ Trustline for ${assetConfig.code} already exists`);
          results.push({
            asset: assetConfig.code,
            success: true,
            transactionHash: 'already_exists'
          });
          continue;
        }
        
        // Build change trust transaction
        const transaction = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE
        })
          .addOperation(
            Operation.changeTrust({
              asset: asset,
              limit: '922337203685.4775807' // Maximum limit
            })
          )
          .setTimeout(30)
          .build();
        
        // Return transaction for signing
        const xdr = transaction.toXDR();
        
        results.push({
          asset: assetConfig.code,
          success: true,
          transactionHash: 'pending_signature',
          xdr: xdr
        });
        
        console.log(`✅ Trustline transaction built for ${assetConfig.code}`);
        
      } catch (error) {
        console.error(`❌ Error creating trustline for ${assetConfig.code}:`, error);
        results.push({
          asset: assetConfig.code,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return {
      success: true,
      results
    };
    
  } catch (error) {
    console.error('❌ Error in createAllTrustlines:', error);
    return {
      success: false,
      results: [{
        asset: 'all',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    };
  }
}

/**
 * Create a single trustline for a specific asset
 */
export async function createSingleTrustline(
  userPublicKey: string, 
  assetCode: string, 
  issuer: string
): Promise<{ success: boolean; xdr?: string; error?: string }> {
  try {
    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(userPublicKey);
    
    const asset = new Asset(assetCode, issuer);
    
    // Check if trustline already exists
    const existingTrustline = account.balances.find(
      (balance: any) => 
        balance.asset_code === assetCode && 
        balance.asset_issuer === issuer
    );
    
    if (existingTrustline) {
      return {
        success: true,
        error: 'Trustline already exists'
      };
    }
    
    // Build change trust transaction
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(
        Operation.changeTrust({
          asset: asset,
          limit: '922337203685.4775807'
        })
      )
      .setTimeout(30)
      .build();
    
    const xdr = transaction.toXDR();
    
    return {
      success: true,
      xdr
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check which trustlines are missing for a user
 */
export async function checkMissingTrustlines(userPublicKey: string): Promise<{
  missing: Array<{ code: string; issuer: string; name: string }>;
  existing: Array<{ code: string; issuer: string; name: string }>;
}> {
  try {
    const server = new Server(HORIZON_URL);
    const account = await server.loadAccount(userPublicKey);
    
    const missing = [];
    const existing = [];
    
    for (const assetConfig of ASSETS_TO_CREATE_TRUSTLINES) {
      const trustlineExists = account.balances.find(
        (balance: any) => 
          balance.asset_code === assetConfig.code && 
          balance.asset_issuer === assetConfig.issuer
      );
      
      if (trustlineExists) {
        existing.push(assetConfig);
      } else {
        missing.push(assetConfig);
      }
    }
    
    return { missing, existing };
    
  } catch (error) {
    console.error('Error checking trustlines:', error);
    return { missing: ASSETS_TO_CREATE_TRUSTLINES, existing: [] };
  }
}

/**
 * Get asset information for display
 */
export function getAssetInfo(assetCode: string) {
  return ASSETS_TO_CREATE_TRUSTLINES.find(asset => asset.code === assetCode);
}

/**
 * Get all supported assets
 */
export function getAllSupportedAssets() {
  return ASSETS_TO_CREATE_TRUSTLINES;
}
