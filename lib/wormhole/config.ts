/**
 * Wormhole Configuration
 * Defines supported chains, assets, and bridge parameters
 */

import { WormholeConfig, WormholeAsset, WormholeChainId } from './types';

// Supported assets configuration
export const SUPPORTED_ASSETS: WormholeAsset[] = [
  // Ethereum assets
  {
    chainId: 'ethereum',
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    symbol: 'ETH',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    chainId: 'ethereum',
    address: '0xA0b86a33E6441b8c4C8C0d4Cecc0f7B2f8C2A5f7', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'ethereum',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    symbol: 'USDT',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    chainId: 'ethereum',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    symbol: 'DAI',
    decimals: 18,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
  },

  // Solana assets
  {
    chainId: 'solana',
    address: 'So11111111111111111111111111111111111111112', // Native SOL
    symbol: 'SOL',
    decimals: 9,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png'
  },
  {
    chainId: 'solana',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'solana',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    symbol: 'USDT',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },

  // Polygon assets
  {
    chainId: 'polygon',
    address: '0x0000000000000000000000000000000000001010', // Native MATIC
    symbol: 'MATIC',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png'
  },
  {
    chainId: 'polygon',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'polygon',
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
    symbol: 'WETH',
    decimals: 18,
    type: 'wrapped',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },

  // Avalanche assets
  {
    chainId: 'avalanche',
    address: '0x0000000000000000000000000000000000000000', // Native AVAX
    symbol: 'AVAX',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png'
  },
  {
    chainId: 'avalanche',
    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'avalanche',
    address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH
    symbol: 'WETH',
    decimals: 18,
    type: 'wrapped',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },

  // BSC assets
  {
    chainId: 'bsc',
    address: '0x0000000000000000000000000000000000000000', // Native BNB
    symbol: 'BNB',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
  },
  {
    chainId: 'bsc',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
    symbol: 'USDC',
    decimals: 18,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'bsc',
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // WETH
    symbol: 'WETH',
    decimals: 18,
    type: 'wrapped',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },

  // Arbitrum assets
  {
    chainId: 'arbitrum',
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    symbol: 'ETH',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    chainId: 'arbitrum',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },

  // Optimism assets
  {
    chainId: 'optimism',
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    symbol: 'ETH',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    chainId: 'optimism',
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },

  // Base assets
  {
    chainId: 'base',
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    symbol: 'ETH',
    decimals: 18,
    type: 'native',
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    chainId: 'base',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },

  // Stellar assets (custom integration)
  {
    chainId: 'stellar',
    address: 'XLM',
    symbol: 'XLM',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/stellar-xlm-logo.png'
  },
  {
    chainId: 'stellar',
    address: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    symbol: 'USDC',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'stellar',
    address: 'USDT:GCQTGZQQ5G4PTM2GL7CDIFKUBIPEC52BROAQIAPW53XBRJVN6ZJVTG6V',
    symbol: 'USDT',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    chainId: 'stellar',
    address: 'INRTEST:GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    symbol: 'INRTEST',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/indian-rupee-inr-logo.png'
  },
  {
    chainId: 'stellar',
    address: 'USDTEST:GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    symbol: 'USDTEST',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    chainId: 'stellar',
    address: 'EURTEST:GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    symbol: 'EURTEST',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/euro-eur-logo.png'
  },
  {
    chainId: 'stellar',
    address: 'PHPTEST:GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC',
    symbol: 'PHPTEST',
    decimals: 7,
    type: 'stellar-asset',
    logoUrl: 'https://cryptologos.cc/logos/philippine-peso-php-logo.png'
  }
];

// Chain configurations
export const WORMHOLE_CONFIG: WormholeConfig = {
  chains: {
    ethereum: {
      chainId: 1,
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      explorerUrl: 'https://etherscan.io',
      bridgeAddress: '0x3ee18B2214AFF97000D97cf826a0Ae0C36392250', // Wormhole Core Bridge
      tokenBridgeAddress: '0x0C30D1d7493956452f0c990C013F7B5c3e5e5F5A', // Token Bridge
      gasToken: 'ETH',
      blockTime: 12 // seconds
    },
    solana: {
      chainId: 101,
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      explorerUrl: 'https://solscan.io',
      bridgeAddress: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb', // Core Bridge Program
      tokenBridgeAddress: 'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb', // Token Bridge Program
      gasToken: 'SOL',
      blockTime: 0.4 // seconds
    },
    polygon: {
      chainId: 137,
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
      explorerUrl: 'https://polygonscan.com',
      bridgeAddress: '0x7A4B5a5621cC8348C927D8c1c2F3A8b4b5d6e7f8', // Mock address
      tokenBridgeAddress: '0x8A5C6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c', // Mock address
      gasToken: 'MATIC',
      blockTime: 2 // seconds
    },
    avalanche: {
      chainId: 43114,
      rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://avalanche-c-chain.publicnode.com',
      explorerUrl: 'https://snowtrace.io',
      bridgeAddress: '0x54a8e5f9c4CbA08F9943965859F6c34eAF053E78', // Core Bridge
      tokenBridgeAddress: '0x0e082F06FF657D94310cB8cE8B0D9a04541d8052', // Token Bridge
      gasToken: 'AVAX',
      blockTime: 2 // seconds
    },
    bsc: {
      chainId: 56,
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      explorerUrl: 'https://bscscan.com',
      bridgeAddress: '0x98f3C9e6E3fAce36bA89905E3466F41FaFa2D80C', // Core Bridge
      tokenBridgeAddress: '0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7', // Token Bridge
      gasToken: 'BNB',
      blockTime: 3 // seconds
    },
    arbitrum: {
      chainId: 42161,
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io',
      bridgeAddress: '0xa5f208e072434bC67592E4C49C1B991BA79BCA46', // Core Bridge
      tokenBridgeAddress: '0x0b2402144Bb366A632D14B83F244D2e0e21bD39c', // Token Bridge
      gasToken: 'ETH',
      blockTime: 0.25 // seconds
    },
    optimism: {
      chainId: 10,
      rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
      explorerUrl: 'https://optimistic.etherscan.io',
      bridgeAddress: '0xEe91C335eab126dF5fB3797e0b6Bd8851f95D6E9', // Core Bridge
      tokenBridgeAddress: '0x1D68124e65faF90753aCEF32490D4d06B62Dc09e', // Token Bridge
      gasToken: 'ETH',
      blockTime: 2 // seconds
    },
    base: {
      chainId: 8453,
      rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      bridgeAddress: '0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627', // Core Bridge
      tokenBridgeAddress: '0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627', // Token Bridge
      gasToken: 'ETH',
      blockTime: 2 // seconds
    },
    stellar: {
      chainId: 148, // Stellar network passphrase hash
      rpcUrl: process.env.STELLAR_RPC_URL || 'https://horizon-testnet.stellar.org',
      explorerUrl: 'https://testnet.stellarchain.io',
      bridgeAddress: 'GDEMO_BRIDGE_ADDRESS', // Mock Stellar bridge address
      tokenBridgeAddress: 'GDEMO_TOKEN_BRIDGE_ADDRESS', // Mock token bridge
      gasToken: 'XLM',
      blockTime: 5, // seconds
      networkPassphrase: 'Test SDF Network ; September 2015',
      isTestnet: true
    }
  },
  supportedAssets: SUPPORTED_ASSETS,
  defaultGasLimit: 500000,
  maxSlippage: 0.01 // 1%
};

// Popular bridge routes for quick access
export const POPULAR_ROUTES = [
  {
    name: 'ETH to SOL',
    sourceChain: 'ethereum' as WormholeChainId,
    destChain: 'solana' as WormholeChainId,
    sourceAsset: 'ETH',
    destAsset: 'SOL',
    description: 'Bridge Ethereum to Solana'
  },
  {
    name: 'USDC Cross-Chain',
    sourceChain: 'ethereum' as WormholeChainId,
    destChain: 'solana' as WormholeChainId,
    sourceAsset: 'USDC',
    destAsset: 'USDC',
    description: 'Bridge USDC between Ethereum and Solana'
  },
  {
    name: 'ETH to Polygon',
    sourceChain: 'ethereum' as WormholeChainId,
    destChain: 'polygon' as WormholeChainId,
    sourceAsset: 'ETH',
    destAsset: 'ETH',
    description: 'Bridge ETH to Polygon'
  },
  {
    name: 'USDC to Avalanche',
    sourceChain: 'ethereum' as WormholeChainId,
    destChain: 'avalanche' as WormholeChainId,
    sourceAsset: 'USDC',
    destAsset: 'USDC',
    description: 'Bridge USDC to Avalanche'
  },
  {
    name: 'ETH to Stellar',
    sourceChain: 'ethereum' as WormholeChainId,
    destChain: 'stellar' as WormholeChainId,
    sourceAsset: 'ETH',
    destAsset: 'XLM',
    description: 'Bridge Ethereum to Stellar'
  },
  {
    name: 'USDC to Stellar',
    sourceChain: 'ethereum' as WormholeChainId,
    destChain: 'stellar' as WormholeChainId,
    sourceAsset: 'USDC',
    destAsset: 'USDC',
    description: 'Bridge USDC to Stellar'
  },
  {
    name: 'SOL to Stellar',
    sourceChain: 'solana' as WormholeChainId,
    destChain: 'stellar' as WormholeChainId,
    sourceAsset: 'SOL',
    destAsset: 'XLM',
    description: 'Bridge Solana to Stellar'
  },
  {
    name: 'Stellar INR Bridge',
    sourceChain: 'stellar' as WormholeChainId,
    destChain: 'stellar' as WormholeChainId,
    sourceAsset: 'INRTEST',
    destAsset: 'USDTEST',
    description: 'Convert INR to USD on Stellar'
  }
];

// Helper functions
export function getAssetBySymbol(symbol: string, chainId?: WormholeChainId): WormholeAsset | undefined {
  return SUPPORTED_ASSETS.find(asset => 
    asset.symbol === symbol && 
    (!chainId || asset.chainId === chainId)
  );
}

export function getAssetsByChain(chainId: WormholeChainId): WormholeAsset[] {
  return SUPPORTED_ASSETS.filter(asset => asset.chainId === chainId);
}

export function isChainSupported(chainId: string): chainId is WormholeChainId {
  return Object.keys(WORMHOLE_CONFIG.chains).includes(chainId);
}

export function getChainConfig(chainId: WormholeChainId) {
  return WORMHOLE_CONFIG.chains[chainId];
}
