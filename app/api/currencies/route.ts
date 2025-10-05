import { NextRequest, NextResponse } from 'next/server';
import { ASSETS } from '../../../lib/stellar';

export async function GET(request: NextRequest) {
  try {
    const supportedCurrencies = [
      {
        code: 'XLM',
        name: 'Stellar Lumens',
        symbol: 'XLM',
        type: 'native',
        decimals: 7,
        icon: 'https://stellar.expert/explorer/public/img/assets/XLM.png',
        network: 'stellar',
        description: 'Native Stellar cryptocurrency',
      },
      {
        code: 'USDC',
        name: 'USD Coin',
        symbol: 'USDC',
        type: 'token',
        decimals: 7,
        icon: 'https://stellar.expert/explorer/public/img/assets/USDC.png',
        network: 'stellar',
        issuer: 'GBBD47IF6LHGT2PJXK7K5QN4K6D7V7V3Y2F3Y2F3Y2F3',
        description: 'USD-pegged stablecoin',
      },
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        type: 'fiat',
        decimals: 2,
        icon: 'https://flagcdn.com/w20/us.png',
        network: 'offchain',
        description: 'United States Dollar',
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        type: 'fiat',
        decimals: 2,
        icon: 'https://flagcdn.com/w20/eu.png',
        network: 'offchain',
        description: 'European Union currency',
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        type: 'fiat',
        decimals: 2,
        icon: 'https://flagcdn.com/w20/gb.png',
        network: 'offchain',
        description: 'British Pound Sterling',
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        type: 'fiat',
        decimals: 2,
        icon: 'https://flagcdn.com/w20/in.png',
        network: 'offchain',
        description: 'Indian Rupee',
      },
      {
        code: 'PHP',
        name: 'Philippine Peso',
        symbol: '₱',
        type: 'fiat',
        decimals: 2,
        icon: 'https://flagcdn.com/w20/ph.png',
        network: 'offchain',
        description: 'Philippine Peso',
      },
    ];

    const popularPairs = [
      { from: 'USD', to: 'INR', name: 'USD to INR', volume: 'high' },
      { from: 'USD', to: 'PHP', name: 'USD to PHP', volume: 'high' },
      { from: 'USD', to: 'EUR', name: 'USD to EUR', volume: 'medium' },
      { from: 'EUR', to: 'USD', name: 'EUR to USD', volume: 'medium' },
      { from: 'GBP', to: 'USD', name: 'GBP to USD', volume: 'medium' },
      { from: 'XLM', to: 'USD', name: 'XLM to USD', volume: 'low' },
      { from: 'USDC', to: 'USD', name: 'USDC to USD', volume: 'high' },
      { from: 'USD', to: 'USDC', name: 'USD to USDC', volume: 'high' },
    ];

    const exchangeRates = {
      timestamp: new Date().toISOString(),
      base: 'USD',
      rates: {
        'USD': 1.0,
        'EUR': 0.85,
        'GBP': 0.73,
        'INR': 83.25,
        'PHP': 55.50,
        'XLM': 0.12,
        'USDC': 1.0,
      },
    };

    const response = {
      success: true,
      currencies: supportedCurrencies,
      popularPairs,
      exchangeRates,
      limits: {
        minimum: 1,
        maximum: 1000000,
        default: 100,
      },
      supportedNetworks: [
        {
          name: 'Stellar',
          code: 'stellar',
          type: 'blockchain',
          description: 'Stellar blockchain network',
        },
        {
          name: 'Off-chain',
          code: 'offchain',
          type: 'traditional',
          description: 'Traditional banking and FX providers',
        },
      ],
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch currencies',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
