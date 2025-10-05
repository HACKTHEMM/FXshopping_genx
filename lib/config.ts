/**
 * Configuration utility for environment variables and error handling
 * Provides centralized configuration management with fallbacks and validation
 */

export interface Config {
  // Stellar Configuration
  stellar: {
    horizonUrl: string;
    networkPassphrase: string;
    baseFee: number;
  };
  
  // MoneyGram Configuration
  moneygram: {
    apiKey: string;
    apiUrl: string;
    clientId: string;
    clientSecret: string;
    isConfigured: boolean;
  };
  
  // Freight Wallet Configuration
  freightWallet: {
    apiKey: string;
    apiUrl: string;
    clientId: string;
    redirectUri: string;
    isConfigured: boolean;
  };
  
  // WalletConnect Configuration
  walletConnect: {
    projectId: string;
    isConfigured: boolean;
  };
  
  // Application Configuration
  app: {
    nodeEnv: string;
    appUrl: string;
    jwtSecret: string;
    encryptionKey: string;
  };
  
  // Security Configuration
  security: {
    rateLimitRequestsPerMinute: number;
  };
  
  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
    debug: boolean;
  };
}

/**
 * Get environment variable with fallback and validation
 */
function getEnvVar(key: string, fallback: string = '', required: boolean = false): string {
  const value = process.env[key] || fallback;
  
  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value;
}

/**
 * Get boolean environment variable
 */
function getBooleanEnvVar(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

/**
 * Get number environment variable
 */
function getNumberEnvVar(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Validate API key format (basic validation)
 */
function isValidApiKey(key: string): boolean {
  return Boolean(key && key.length > 10 && key !== 'your_api_key_here' && !key.includes('placeholder'));
}

/**
 * Get application configuration
 */
export function getConfig(): Config {
  const moneygramApiKey = getEnvVar('MONEYGRAM_API_KEY');
  const freightWalletApiKey = getEnvVar('FREIGHT_WALLET_API_KEY');
  const walletConnectProjectId = getEnvVar('WALLETCONNECT_PROJECT_ID');
  
  return {
    stellar: {
      horizonUrl: getEnvVar('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
      networkPassphrase: getEnvVar('STELLAR_NETWORK_PASSPHRASE', 'Test SDF Network ; September 2015'),
      baseFee: getNumberEnvVar('STELLAR_BASE_FEE', 100),
    },
    
    moneygram: {
      apiKey: moneygramApiKey,
      apiUrl: getEnvVar('MONEYGRAM_API_URL', 'https://api.moneygram.com/v1'),
      clientId: getEnvVar('MONEYGRAM_CLIENT_ID'),
      clientSecret: getEnvVar('MONEYGRAM_CLIENT_SECRET'),
      isConfigured: isValidApiKey(moneygramApiKey) && 
                   isValidApiKey(getEnvVar('MONEYGRAM_CLIENT_ID')) && 
                   isValidApiKey(getEnvVar('MONEYGRAM_CLIENT_SECRET')),
    },
    
    freightWallet: {
      apiKey: freightWalletApiKey,
      apiUrl: getEnvVar('FREIGHT_WALLET_API_URL', 'https://api.freightwallet.com/v1'),
      clientId: getEnvVar('FREIGHT_WALLET_CLIENT_ID'),
      redirectUri: getEnvVar('FREIGHT_WALLET_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
      isConfigured: isValidApiKey(freightWalletApiKey) && 
                   isValidApiKey(getEnvVar('FREIGHT_WALLET_CLIENT_ID')),
    },
    
    walletConnect: {
      projectId: walletConnectProjectId,
      isConfigured: isValidApiKey(walletConnectProjectId),
    },
    
    app: {
      nodeEnv: getEnvVar('NODE_ENV', 'development'),
      appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      jwtSecret: getEnvVar('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
      encryptionKey: getEnvVar('ENCRYPTION_KEY', 'dev-encryption-key-32-bytes-long'),
    },
    
    security: {
      rateLimitRequestsPerMinute: getNumberEnvVar('RATE_LIMIT_REQUESTS_PER_MINUTE', 100),
    },
    
    features: {
      enableAnalytics: getBooleanEnvVar('ENABLE_ANALYTICS', false),
      enableErrorReporting: getBooleanEnvVar('ENABLE_ERROR_REPORTING', false),
      debug: getBooleanEnvVar('DEBUG', false),
    },
  };
}

/**
 * Configuration validation and health check
 */
export function validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const config = getConfig();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required configurations
  if (!config.moneygram.isConfigured) {
    warnings.push('MoneyGram API not configured - anchor provider features will be limited');
  }
  
  if (!config.freightWallet.isConfigured) {
    warnings.push('Freight Wallet API not configured - wallet connection features will be limited');
  }
  
  if (!config.walletConnect.isConfigured) {
    warnings.push('WalletConnect not configured - multi-wallet support will be limited');
  }
  
  // Security warnings
  if (config.app.nodeEnv === 'production') {
    if (config.app.jwtSecret === 'dev-jwt-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed in production');
    }
    
    if (config.app.encryptionKey === 'dev-encryption-key-32-bytes-long') {
      errors.push('ENCRYPTION_KEY must be changed in production');
    }
  }
  
  // Validate encryption key length
  if (config.app.encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get configuration status for debugging
 */
export function getConfigStatus(): Record<string, any> {
  const config = getConfig();
  const validation = validateConfig();
  
  return {
    stellar: {
      horizonUrl: config.stellar.horizonUrl,
      networkPassphrase: config.stellar.networkPassphrase,
      baseFee: config.stellar.baseFee,
    },
    moneygram: {
      isConfigured: config.moneygram.isConfigured,
      apiUrl: config.moneygram.apiUrl,
      hasApiKey: !!config.moneygram.apiKey,
      hasClientId: !!config.moneygram.clientId,
      hasClientSecret: !!config.moneygram.clientSecret,
    },
    freightWallet: {
      isConfigured: config.freightWallet.isConfigured,
      apiUrl: config.freightWallet.apiUrl,
      hasApiKey: !!config.freightWallet.apiKey,
      hasClientId: !!config.freightWallet.clientId,
      redirectUri: config.freightWallet.redirectUri,
    },
    walletConnect: {
      isConfigured: config.walletConnect.isConfigured,
      hasProjectId: !!config.walletConnect.projectId,
    },
    app: {
      nodeEnv: config.app.nodeEnv,
      appUrl: config.app.appUrl,
      hasJwtSecret: !!config.app.jwtSecret,
      hasEncryptionKey: !!config.app.encryptionKey,
    },
    validation,
  };
}

/**
 * Error handling utilities
 */
export class ConfigurationError extends Error {
  constructor(message: string, public configKey: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(service: string, reason: string) {
    super(`${service} service unavailable: ${reason}`);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Check if a service is available based on configuration
 */
export function isServiceAvailable(service: 'moneygram' | 'freightWallet' | 'walletConnect'): boolean {
  const config = getConfig();
  
  switch (service) {
    case 'moneygram':
      return config.moneygram.isConfigured;
    case 'freightWallet':
      return config.freightWallet.isConfigured;
    case 'walletConnect':
      return config.walletConnect.isConfigured;
    default:
      return false;
  }
}

/**
 * Get service configuration with fallback handling
 */
export function getServiceConfig(service: 'moneygram' | 'freightWallet' | 'walletConnect') {
  const config = getConfig();
  
  switch (service) {
    case 'moneygram':
      if (!config.moneygram.isConfigured) {
        throw new ServiceUnavailableError('MoneyGram', 'API credentials not configured');
      }
      return config.moneygram;
    case 'freightWallet':
      if (!config.freightWallet.isConfigured) {
        throw new ServiceUnavailableError('Freight Wallet', 'API credentials not configured');
      }
      return config.freightWallet;
    case 'walletConnect':
      if (!config.walletConnect.isConfigured) {
        throw new ServiceUnavailableError('WalletConnect', 'Project ID not configured');
      }
      return config.walletConnect;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

// Export default configuration instance
export const config = getConfig();
