import { 
  PaymentRoute, 
  PathPaymentQuery, 
  getStellarPathPayments, 
  getStellarStrictSendPaths,
  getAccountInfo,
  getAccountBalances,
  StellarError,
  getAssetFromCurrency
} from './stellar';
import { anchorManager, AnchorInfo, AnchorQuote } from './anchor-integration';
import { complianceManager } from './compliance-security';
import { streamingService } from './streaming-service';

// Interface for FX provider
export interface FXProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  supportedCurrencies: string[];
  fees: {
    fixed: number;
    percentage: number;
    minimum: number;
  };
  limits: {
    minimum: number;
    maximum: number;
  };
  kycRequired: boolean;
  estimatedSettlementTime: string; // e.g., "1-3 business days"
}

// Mock FX providers data
const FX_PROVIDERS: FXProvider[] = [
  {
    id: 'wise',
    name: 'Wise',
    baseUrl: 'https://api.wise.com',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP', 'USDC'],
    fees: { fixed: 0.5, percentage: 0.65, minimum: 1 },
    limits: { minimum: 1, maximum: 1000000 },
    kycRequired: true,
    estimatedSettlementTime: '1-2 business days',
  },
  {
    id: 'remitly',
    name: 'Remitly',
    baseUrl: 'https://api.remitly.com',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP'],
    fees: { fixed: 0, percentage: 1.2, minimum: 2 },
    limits: { minimum: 1, maximum: 50000 },
    kycRequired: true,
    estimatedSettlementTime: '1-3 business days',
  },
  {
    id: 'worldremit',
    name: 'WorldRemit',
    baseUrl: 'https://api.worldremit.com',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'PHP'],
    fees: { fixed: 1, percentage: 0.8, minimum: 1.5 },
    limits: { minimum: 5, maximum: 100000 },
    kycRequired: true,
    estimatedSettlementTime: '1-2 business days',
  },
  {
    id: 'stellar_anchor_1',
    name: 'Stellar Anchor - MoneyGram',
    baseUrl: 'https://anchor.moneygram.com',
    supportedCurrencies: ['USD', 'EUR', 'XLM'],
    fees: { fixed: 0, percentage: 0.5, minimum: 0 },
    limits: { minimum: 1, maximum: 10000 },
    kycRequired: false,
    estimatedSettlementTime: 'instant',
  },
  {
    id: 'stellar_anchor_2',
    name: 'Stellar Anchor - Circle',
    baseUrl: 'https://anchor.circle.com',
    supportedCurrencies: ['USD', 'USDC', 'XLM'],
    fees: { fixed: 0, percentage: 0.3, minimum: 0 },
    limits: { minimum: 1, maximum: 50000 },
    kycRequired: true,
    estimatedSettlementTime: 'instant',
  },
];

// Mock FX rates (in production, these would come from real APIs)
const MOCK_FX_RATES: Record<string, Record<string, number>> = {
  'USD': {
    'EUR': 0.85,
    'GBP': 0.73,
    'INR': 83.25,
    'PHP': 55.50,
    'XLM': 0.12,
    'USDC': 1.0,
  },
  'EUR': {
    'USD': 1.18,
    'GBP': 0.86,
    'INR': 98.15,
    'PHP': 65.25,
    'XLM': 0.14,
    'USDC': 1.18,
  },
  'GBP': {
    'USD': 1.37,
    'EUR': 1.16,
    'INR': 114.25,
    'PHP': 76.10,
    'XLM': 0.16,
    'USDC': 1.37,
  },
  'INR': {
    'USD': 0.012,
    'EUR': 0.010,
    'GBP': 0.0087,
    'PHP': 0.67,
    'XLM': 0.0014,
    'USDC': 0.012,
  },
  'PHP': {
    'USD': 0.018,
    'EUR': 0.015,
    'GBP': 0.013,
    'INR': 1.49,
    'XLM': 0.0022,
    'USDC': 0.018,
  },
  'XLM': {
    'USD': 8.33,
    'EUR': 7.14,
    'GBP': 6.25,
    'INR': 694.44,
    'PHP': 454.55,
    'USDC': 8.33,
  },
  'USDC': {
    'USD': 1.0,
    'EUR': 0.85,
    'GBP': 0.73,
    'INR': 83.25,
    'PHP': 55.50,
    'XLM': 0.12,
  },
};

/**
 * Get FX rate between two currencies
 */
export function getFXRate(sourceCurrency: string, targetCurrency: string): number {
  if (sourceCurrency === targetCurrency) return 1.0;
  
  const rates = MOCK_FX_RATES[sourceCurrency.toUpperCase()];
  if (!rates) return 0;
  
  return rates[targetCurrency.toUpperCase()] || 0;
}

/**
 * Calculate fees for a provider
 */
export function calculateProviderFees(
  provider: FXProvider,
  amount: number,
  sourceCurrency: string,
  targetCurrency: string
): number {
  const fxRate = getFXRate(sourceCurrency, targetCurrency);
  const convertedAmount = amount * fxRate;
  
  const percentageFee = (convertedAmount * provider.fees.percentage) / 100;
  const totalFee = Math.max(
    provider.fees.fixed + percentageFee,
    provider.fees.minimum
  );
  
  return totalFee;
}

/**
 * Get available FX providers for currency pair
 */
export function getAvailableProviders(sourceCurrency: string, targetCurrency: string): FXProvider[] {
  return FX_PROVIDERS.filter(provider => 
    provider.supportedCurrencies.includes(sourceCurrency.toUpperCase()) &&
    provider.supportedCurrencies.includes(targetCurrency.toUpperCase())
  );
}

/**
 * Generate real anchor routes using SEP-24/SEP-31
 */
export async function generateAnchorRoutes(
  query: PathPaymentQuery,
  sourceAccount?: string
): Promise<PaymentRoute[]> {
  const routes: PaymentRoute[] = [];
  
  try {
    // Get available anchors for the target currency
    const anchors = await anchorManager.getAnchorsForCurrency(query.targetCurrency);
    
    for (const anchor of anchors) {
      try {
        // Get quote from anchor
        const quote = await anchorManager.getQuote(
          anchor.domain,
          query.sourceCurrency,
          query.targetCurrency,
          query.sourceAmount.toString(),
          sourceAccount
        );
        
        // Calculate fees
        const totalFees = parseFloat(quote.fee.total);
        const netRecipientAmount = parseFloat(quote.buyAmount) - totalFees;
        
        routes.push({
          id: `anchor_${anchor.domain}_${Date.now()}`,
          type: 'stellar_anchor',
          sourceCurrency: query.sourceCurrency,
          targetCurrency: query.targetCurrency,
          sourceAmount: query.sourceAmount,
          targetAmount: parseFloat(quote.buyAmount),
          fees: {
            stellarFee: 0.00001,
            anchorFee: totalFees,
            totalFees: totalFees + 0.00001,
          },
          netRecipientAmount: netRecipientAmount,
          provider: {
            name: anchor.name,
            anchorInfo: {
              code: anchor.domain,
              domain: anchor.url,
            },
          },
          estimatedTime: '1-2 business days',
          confidence: 90,
          requiresKYC: true,
          quote: {
            id: quote.id,
            expiresAt: quote.expiresAt,
            price: quote.price,
          },
        });
      } catch (error) {
        console.error(`Failed to get quote from anchor ${anchor.domain}:`, error);
        // Continue with other anchors
      }
    }
  } catch (error) {
    console.error('Error generating anchor routes:', error);
  }
  
  return routes;
}

/**
 * Generate off-chain FX routes with real provider integration
 */
export async function generateOffChainRoutes(
  query: PathPaymentQuery,
  providers: FXProvider[],
  sourceAccount?: string
): Promise<PaymentRoute[]> {
  const routes: PaymentRoute[] = [];
  
  for (const provider of providers) {
    try {
      // Skip if amount is below minimum or above maximum
      if (query.sourceAmount < provider.limits.minimum || 
          query.sourceAmount > provider.limits.maximum) {
        continue;
      }
      
      // Get real-time quote from provider (mock implementation)
      const quote = await getProviderQuote(provider, query);
      
      if (!quote) {
        continue;
      }
      
      const fees = calculateProviderFees(
        provider,
        query.sourceAmount,
        query.sourceCurrency,
        query.targetCurrency
      );
      const netRecipientAmount = quote.targetAmount - fees;
      
      routes.push({
        id: `offchain_${provider.id}_${Date.now()}`,
        type: 'offchain_fx',
        sourceCurrency: query.sourceCurrency,
        targetCurrency: query.targetCurrency,
        sourceAmount: query.sourceAmount,
        targetAmount: quote.targetAmount,
        fees: {
          stellarFee: 0,
          fxSpread: fees,
          totalFees: fees,
        },
        netRecipientAmount: netRecipientAmount,
        provider: {
          name: provider.name,
          anchorInfo: provider.id.startsWith('stellar_anchor') ? {
            code: provider.id.split('_')[2],
            domain: provider.baseUrl,
          } : undefined,
        },
        estimatedTime: provider.estimatedSettlementTime,
        confidence: 95 - (routes.length * 5),
        requiresKYC: provider.kycRequired,
        quote: {
          id: quote.id,
          expiresAt: quote.expiresAt,
          price: quote.price,
        },
      });
    } catch (error) {
      console.error(`Failed to get quote from provider ${provider.name}:`, error);
      // Continue with other providers
    }
  }
  
  return routes;
}

/**
 * Get real-time quote from FX provider
 */
async function getProviderQuote(
  provider: FXProvider,
  query: PathPaymentQuery
): Promise<{
  id: string;
  targetAmount: number;
  price: string;
  expiresAt: string;
} | null> {
  try {
    // In production, this would make real API calls to providers
    // For demo purposes, we'll simulate realistic quotes
    
    const fxRate = getFXRate(query.sourceCurrency, query.targetCurrency);
    const baseAmount = query.sourceAmount * fxRate;
    
    // Add provider-specific spread
    const spread = provider.fees.percentage / 100;
    const targetAmount = baseAmount * (1 - spread);
    
    return {
      id: `quote_${provider.id}_${Date.now()}`,
      targetAmount: targetAmount,
      price: (targetAmount / query.sourceAmount).toString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    };
  } catch (error) {
    console.error(`Error getting quote from ${provider.name}:`, error);
    return null;
  }
}

/**
 * Generate real Stellar on-chain routes using Horizon API
 */
export async function generateStellarRoutes(
  query: PathPaymentQuery,
  sourceAccount?: string
): Promise<PaymentRoute[]> {
  const routes: PaymentRoute[] = [];
  
  try {
    // Get source and target assets
    const sourceAsset = getAssetFromCurrency(query.sourceCurrency);
    const targetAsset = getAssetFromCurrency(query.targetCurrency);
    
    // Get path payments from Stellar network
    const pathPayments = await getStellarPathPayments(
      sourceAsset,
      targetAsset,
      query.sourceAmount.toString(),
      query.targetAccount
    );
    
    // Also try strict send paths for better liquidity discovery
    const strictSendPaths = await getStellarStrictSendPaths(
      sourceAsset,
      targetAsset,
      query.sourceAmount.toString(),
      query.targetAccount
    );
    
    // Process path payments
    pathPayments.forEach((path, index) => {
      const sourceAmount = parseFloat(path.source_amount);
      const destinationAmount = parseFloat(path.destination_amount);
      const stellarFee = parseFloat(path.source_asset_type === 'native' ? '0.00001' : '0.0001');
      
      routes.push({
        id: `stellar_onchain_${Date.now()}_${index}`,
        type: 'stellar_onchain',
        sourceCurrency: query.sourceCurrency,
        targetCurrency: query.targetCurrency,
        sourceAmount: query.sourceAmount,
        targetAmount: destinationAmount,
        fees: {
          stellarFee: stellarFee,
          totalFees: stellarFee,
        },
        netRecipientAmount: destinationAmount,
        provider: {
          name: 'Stellar Network',
          address: path.destination_asset_issuer || 'native',
        },
        estimatedTime: 'instant',
        confidence: 99,
        requiresKYC: false,
        path: path.path || [],
        liquidity: {
          source: sourceAmount,
          destination: destinationAmount,
          pathLength: path.path ? path.path.length : 0
        }
      });
    });
    
    // Process strict send paths
    strictSendPaths.forEach((path, index) => {
      const sourceAmount = parseFloat(path.source_amount);
      const destinationAmount = parseFloat(path.destination_amount);
      const stellarFee = parseFloat(path.source_asset_type === 'native' ? '0.00001' : '0.0001');
      
      routes.push({
        id: `stellar_strict_send_${Date.now()}_${index}`,
        type: 'stellar_onchain',
        sourceCurrency: query.sourceCurrency,
        targetCurrency: query.targetCurrency,
        sourceAmount: query.sourceAmount,
        targetAmount: destinationAmount,
        fees: {
          stellarFee: stellarFee,
          totalFees: stellarFee,
        },
        netRecipientAmount: destinationAmount,
        provider: {
          name: 'Stellar Network (Strict Send)',
          address: path.destination_asset_issuer || 'native',
        },
        estimatedTime: 'instant',
        confidence: 95,
        requiresKYC: false,
        path: path.path || [],
        liquidity: {
          source: sourceAmount,
          destination: destinationAmount,
          pathLength: path.path ? path.path.length : 0
        }
      });
    });
    
    // If no paths found, create a direct payment route
    if (routes.length === 0) {
      const directRoute = await createDirectPaymentRoute(query, sourceAccount);
      if (directRoute) {
        routes.push(directRoute);
      }
    }
    
  } catch (error) {
    console.error('Error generating Stellar routes:', error);
    
    // Fallback to mock routes if real data fails
    const mockRoutes = generateMockStellarRoutes(query);
    routes.push(...mockRoutes);
  }
  
  return routes;
}

/**
 * Create direct payment route when no path payments are available
 */
async function createDirectPaymentRoute(
  query: PathPaymentQuery,
  sourceAccount?: string
): Promise<PaymentRoute | null> {
  try {
    // Check if source account has the required asset
    if (sourceAccount) {
      const balances = await getAccountBalances(sourceAccount);
      const sourceBalance = balances.find(b => 
        b.asset_code === query.sourceCurrency || 
        (query.sourceCurrency === 'XLM' && b.asset_type === 'native')
      );
      
      if (!sourceBalance || parseFloat(sourceBalance.balance) < query.sourceAmount) {
        return null; // Insufficient balance
      }
    }
    
    // Use current market rate for direct conversion
    const fxRate = getFXRate(query.sourceCurrency, query.targetCurrency);
    const targetAmount = query.sourceAmount * fxRate;
    const stellarFee = 0.00001;
    
    return {
      id: `stellar_direct_${Date.now()}`,
      type: 'stellar_onchain',
      sourceCurrency: query.sourceCurrency,
      targetCurrency: query.targetCurrency,
      sourceAmount: query.sourceAmount,
      targetAmount: targetAmount,
      fees: {
        stellarFee: stellarFee,
        totalFees: stellarFee,
      },
      netRecipientAmount: targetAmount - stellarFee,
      provider: {
        name: 'Stellar Network (Direct)',
        address: 'native',
      },
      estimatedTime: 'instant',
      confidence: 85,
      requiresKYC: false,
      liquidity: {
        source: query.sourceAmount,
        destination: targetAmount,
        pathLength: 0
      }
    };
  } catch (error) {
    console.error('Error creating direct payment route:', error);
    return null;
  }
}

/**
 * Generate mock Stellar routes as fallback
 */
function generateMockStellarRoutes(query: PathPaymentQuery): PaymentRoute[] {
  const fxRate = getFXRate(query.sourceCurrency, query.targetCurrency);
  const targetAmount = query.sourceAmount * fxRate;
  const stellarFee = 0.00001;
  
  return [{
    id: `stellar_mock_${Date.now()}`,
    type: 'stellar_onchain',
    sourceCurrency: query.sourceCurrency,
    targetCurrency: query.targetCurrency,
    sourceAmount: query.sourceAmount,
    targetAmount: targetAmount,
    fees: {
      stellarFee: stellarFee,
      totalFees: stellarFee,
    },
    netRecipientAmount: targetAmount - stellarFee,
    provider: {
      name: 'Stellar Network (Mock)',
      address: 'native',
    },
    estimatedTime: 'instant',
    confidence: 70,
    requiresKYC: false,
  }];
}

/**
 * Enhanced route optimization with real-time data and compliance
 */
export async function optimizeRoutes(
  stellarRoutes: PaymentRoute[],
  offChainRoutes: PaymentRoute[],
  sourceAccount?: string,
  targetAccount?: string,
  userPreferences?: {
    prioritizeSpeed?: boolean;
    prioritizeCost?: boolean;
    maxRiskScore?: number;
    requireKYC?: boolean;
  }
): Promise<PaymentRoute[]> {
  const allRoutes = [...stellarRoutes, ...offChainRoutes];
  
  // Apply compliance checks if accounts are provided
  let filteredRoutes = allRoutes;
  
  if (sourceAccount && targetAccount) {
    filteredRoutes = await applyComplianceFilters(allRoutes, sourceAccount, targetAccount, userPreferences);
  }
  
  // Apply user preferences
  if (userPreferences) {
    filteredRoutes = applyUserPreferences(filteredRoutes, userPreferences);
  }
  
  // Sort by optimization score
  return filteredRoutes
    .filter(route => route.netRecipientAmount > 0)
    .map(route => ({
      ...route,
      optimizationScore: calculateOptimizationScore(route, userPreferences)
    }))
    .sort((a, b) => b.optimizationScore - a.optimizationScore)
    .map((route, index) => ({
      ...route,
      confidence: Math.max(route.confidence - (index * 2), 70),
      rank: index + 1
    }));
}

/**
 * Apply compliance filters to routes
 */
async function applyComplianceFilters(
  routes: PaymentRoute[],
  sourceAccount: string,
  targetAccount: string,
  userPreferences?: any
): Promise<PaymentRoute[]> {
  const filteredRoutes: PaymentRoute[] = [];
  
  for (const route of routes) {
    try {
      // Check compliance for this route
      const compliance = await complianceManager.validateTransactionCompliance(
        sourceAccount,
        targetAccount,
        route.sourceAmount,
        route.sourceCurrency,
        'payment'
      );
      
      // Skip route if not allowed
      if (!compliance.allowed) {
        console.log(`Route ${route.id} blocked by compliance:`, compliance.reasons);
        continue;
      }
      
      // Add compliance info to route
      const enhancedRoute = {
        ...route,
        compliance: {
          riskScore: compliance.riskScore,
          requiresApproval: compliance.requiresApproval,
          kycRequired: compliance.kycRequired,
          amlRequired: compliance.amlRequired,
          reasons: compliance.reasons
        }
      };
      
      // Check user preferences
      if (userPreferences?.maxRiskScore && compliance.riskScore > userPreferences.maxRiskScore) {
        continue;
      }
      
      if (userPreferences?.requireKYC && compliance.kycRequired && !route.requiresKYC) {
        continue;
      }
      
      filteredRoutes.push(enhancedRoute);
    } catch (error) {
      console.error(`Compliance check failed for route ${route.id}:`, error);
      // Include route but mark as high risk
      filteredRoutes.push({
        ...route,
        compliance: {
          riskScore: 100,
          requiresApproval: true,
          kycRequired: true,
          amlRequired: true,
          reasons: ['Compliance check failed']
        }
      });
    }
  }
  
  return filteredRoutes;
}

/**
 * Apply user preferences to routes
 */
function applyUserPreferences(
  routes: PaymentRoute[],
  preferences: {
    prioritizeSpeed?: boolean;
    prioritizeCost?: boolean;
    maxRiskScore?: number;
    requireKYC?: boolean;
  }
): PaymentRoute[] {
  return routes.filter(route => {
    // Filter by risk score
    if (preferences.maxRiskScore && (route as any).compliance?.riskScore > preferences.maxRiskScore) {
      return false;
    }
    
    // Filter by KYC requirement
    if (preferences.requireKYC && !route.requiresKYC) {
      return false;
    }
    
    return true;
  });
}

/**
 * Calculate optimization score for a route
 */
function calculateOptimizationScore(
  route: PaymentRoute,
  preferences?: {
    prioritizeSpeed?: boolean;
    prioritizeCost?: boolean;
  }
): number {
  let score = 0;
  
  // Base score from net recipient amount (higher is better)
  score += route.netRecipientAmount * 0.4;
  
  // Speed factor
  const speedScore = getSpeedScore(route.estimatedTime);
  score += speedScore * 0.3;
  
  // Cost factor (lower fees = higher score)
  const costScore = Math.max(0, 100 - (route.fees.totalFees / route.sourceAmount) * 100);
  score += costScore * 0.2;
  
  // Confidence factor
  score += route.confidence * 0.1;
  
  // Apply user preferences
  if (preferences?.prioritizeSpeed) {
    score += speedScore * 0.2;
  }
  
  if (preferences?.prioritizeCost) {
    score += costScore * 0.2;
  }
  
  return score;
}

/**
 * Convert estimated time to speed score
 */
function getSpeedScore(estimatedTime: string): number {
  if (estimatedTime === 'instant') return 100;
  if (estimatedTime.includes('minute')) return 90;
  if (estimatedTime.includes('hour')) return 70;
  if (estimatedTime.includes('day')) return 50;
  if (estimatedTime.includes('week')) return 20;
  return 10;
}

/**
 * Main route discovery function - finds all available routes
 */
export async function discoverRoutes(
  query: PathPaymentQuery,
  options: {
    includeStellar?: boolean;
    includeAnchors?: boolean;
    includeOffChain?: boolean;
    sourceAccount?: string;
    userPreferences?: {
      prioritizeSpeed?: boolean;
      prioritizeCost?: boolean;
      maxRiskScore?: number;
      requireKYC?: boolean;
    };
  } = {}
): Promise<{
  routes: PaymentRoute[];
  summary: {
    totalRoutes: number;
    bestRoute: PaymentRoute | null;
    savings: {
      vsWorst: number;
      vsAverage: number;
    };
    routeTypes: {
      stellar: number;
      anchors: number;
      offchain: number;
    };
    compliance: {
      totalChecked: number;
      blocked: number;
      requiresApproval: number;
    };
  };
}> {
  const {
    includeStellar = true,
    includeAnchors = true,
    includeOffChain = true,
    sourceAccount,
    userPreferences
  } = options;

  console.log('🔍 Discovering payment routes...', {
    query,
    options: { includeStellar, includeAnchors, includeOffChain }
  });

  const allRoutes: PaymentRoute[] = [];
  let complianceStats = {
    totalChecked: 0,
    blocked: 0,
    requiresApproval: 0
  };

  try {
    // Discover Stellar on-chain routes
    if (includeStellar) {
      console.log('📡 Discovering Stellar on-chain routes...');
      const stellarRoutes = await generateStellarRoutes(query, sourceAccount);
      allRoutes.push(...stellarRoutes);
      console.log(`Found ${stellarRoutes.length} Stellar routes`);
    }

    // Discover anchor routes
    if (includeAnchors) {
      console.log('🏦 Discovering anchor routes...');
      const anchorRoutes = await generateAnchorRoutes(query, sourceAccount);
      allRoutes.push(...anchorRoutes);
      console.log(`Found ${anchorRoutes.length} anchor routes`);
    }

    // Discover off-chain FX routes
    if (includeOffChain) {
      console.log('💱 Discovering off-chain FX routes...');
      const availableProviders = getAvailableProviders(query.sourceCurrency, query.targetCurrency);
      const offChainRoutes = await generateOffChainRoutes(query, availableProviders, sourceAccount);
      allRoutes.push(...offChainRoutes);
      console.log(`Found ${offChainRoutes.length} off-chain routes`);
    }

    // Optimize and rank routes
    console.log('⚡ Optimizing routes...');
    const optimizedRoutes = await optimizeRoutes(
      allRoutes.filter(r => r.type === 'stellar_onchain'),
      allRoutes.filter(r => r.type === 'stellar_anchor' || r.type === 'offchain_fx'),
      sourceAccount,
      query.targetAccount,
      userPreferences
    );

    // Calculate compliance statistics
    optimizedRoutes.forEach(route => {
      complianceStats.totalChecked++;
      if ((route as any).compliance) {
        if (!(route as any).compliance.allowed) {
          complianceStats.blocked++;
        }
        if ((route as any).compliance.requiresApproval) {
          complianceStats.requiresApproval++;
        }
      }
    });

    // Generate summary
    const summary = getRouteOptimizationSummary(optimizedRoutes, complianceStats);

    console.log('✅ Route discovery completed', {
      totalRoutes: optimizedRoutes.length,
      bestRoute: summary.bestRoute?.provider.name,
      savings: summary.savings
    });

    return {
      routes: optimizedRoutes,
      summary
    };

  } catch (error) {
    console.error('❌ Route discovery failed:', error);
    throw error;
  }
}

/**
 * Enhanced route optimization summary
 */
export function getRouteOptimizationSummary(
  routes: PaymentRoute[],
  complianceStats?: {
    totalChecked: number;
    blocked: number;
    requiresApproval: number;
  }
): {
  totalRoutes: number;
  bestRoute: PaymentRoute | null;
  savings: {
    vsWorst: number;
    vsAverage: number;
  };
  routeTypes: {
    stellar: number;
    anchors: number;
    offchain: number;
  };
  compliance: {
    totalChecked: number;
    blocked: number;
    requiresApproval: number;
  };
} {
  if (routes.length === 0) {
    return {
      totalRoutes: 0,
      bestRoute: null,
      savings: { vsWorst: 0, vsAverage: 0 },
      routeTypes: { stellar: 0, anchors: 0, offchain: 0 },
      compliance: complianceStats || { totalChecked: 0, blocked: 0, requiresApproval: 0 },
    };
  }
  
  const bestRoute = routes[0];
  const worstRoute = routes[routes.length - 1];
  const averageAmount = routes.reduce((sum, route) => sum + route.netRecipientAmount, 0) / routes.length;
  
  const stellarRoutes = routes.filter(r => r.type === 'stellar_onchain');
  const anchorRoutes = routes.filter(r => r.type === 'stellar_anchor');
  const offchainRoutes = routes.filter(r => r.type === 'offchain_fx');
  
  return {
    totalRoutes: routes.length,
    bestRoute,
    savings: {
      vsWorst: bestRoute.netRecipientAmount - worstRoute.netRecipientAmount,
      vsAverage: bestRoute.netRecipientAmount - averageAmount,
    },
    routeTypes: {
      stellar: stellarRoutes.length,
      anchors: anchorRoutes.length,
      offchain: offchainRoutes.length,
    },
    compliance: complianceStats || { totalChecked: 0, blocked: 0, requiresApproval: 0 },
  };
}

/**
 * Get real-time route updates
 */
export function subscribeToRouteUpdates(
  query: PathPaymentQuery,
  callback: (routes: PaymentRoute[]) => void,
  interval: number = 30000 // 30 seconds
): () => void {
  let isActive = true;
  let lastRoutes: PaymentRoute[] = [];

  const updateRoutes = async () => {
    if (!isActive) return;

    try {
      const { routes } = await discoverRoutes(query, {
        includeStellar: true,
        includeAnchors: true,
        includeOffChain: true
      });

      // Only call callback if routes have changed
      if (JSON.stringify(routes) !== JSON.stringify(lastRoutes)) {
        lastRoutes = routes;
        callback(routes);
      }
    } catch (error) {
      console.error('Error updating routes:', error);
    }
  };

  // Initial discovery
  updateRoutes();

  // Set up interval
  const intervalId = setInterval(updateRoutes, interval);

  // Return cleanup function
  return () => {
    isActive = false;
    clearInterval(intervalId);
  };
}
