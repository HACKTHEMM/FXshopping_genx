'use client';

import { useState, useEffect } from 'react';
import { apiClient, PaymentRoute, formatAmount, formatPercentage, getConfidenceColor, getConfidenceLabel } from '../../lib/api-client';

interface RouteSearchProps {
  onRouteSelect?: (route: PaymentRoute) => void;
  onExecutePayment?: (route: PaymentRoute) => void;
}

export default function RouteSearch({ onRouteSelect, onExecutePayment }: RouteSearchProps) {
  const [searchParams, setSearchParams] = useState({
    sourceCurrency: 'USD',
    targetCurrency: 'INR',
    sourceAmount: 1000,
    sourceAccount: '',
    targetAccount: '',
  });

  const [routes, setRoutes] = useState<PaymentRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<PaymentRoute | null>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  // Load currencies on component mount
  useEffect(() => {
    loadCurrencies();
  }, []);

  // Update exchange rate when currencies change
  useEffect(() => {
    if (searchParams.sourceCurrency && searchParams.targetCurrency) {
      updateExchangeRate();
    }
  }, [searchParams.sourceCurrency, searchParams.targetCurrency]);

  const loadCurrencies = async () => {
    try {
      const response = await apiClient.getCurrencies();
      setCurrencies(response.currencies);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const updateExchangeRate = async () => {
    try {
      const rate = await apiClient.getExchangeRate(
        searchParams.sourceCurrency,
        searchParams.targetCurrency
      );
      setExchangeRate(rate);
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchParams.sourceAmount || searchParams.sourceAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedRoute(null);

    try {
      const response = await apiClient.searchRoutes({
        sourceCurrency: searchParams.sourceCurrency,
        targetCurrency: searchParams.targetCurrency,
        sourceAmount: searchParams.sourceAmount,
        sourceAccount: searchParams.sourceAccount || undefined,
        targetAccount: searchParams.targetAccount || undefined,
      });

      setRoutes(response.routes);
      
      // Auto-select best route
      if (response.routes.length > 0) {
        const bestRoute = response.routes[0];
        setSelectedRoute(bestRoute);
        onRouteSelect?.(bestRoute);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search routes');
      console.error('Route search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (route: PaymentRoute) => {
    setSelectedRoute(route);
    onRouteSelect?.(route);
  };

  const handleExecutePayment = () => {
    if (selectedRoute) {
      onExecutePayment?.(selectedRoute);
    }
  };

  const getCurrencyIcon = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.icon || '/stellar-xlm-logo.png';
  };

  const getCurrencyName = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.name || currencyCode;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-black mb-6">Find the Best Payment Route</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Source Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Currency
            </label>
            <select
              value={searchParams.sourceCurrency}
              onChange={(e) => setSearchParams(prev => ({ ...prev, sourceCurrency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Currency
            </label>
            <select
              value={searchParams.targetCurrency}
              onChange={(e) => setSearchParams(prev => ({ ...prev, targetCurrency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={searchParams.sourceAmount}
              onChange={(e) => setSearchParams(prev => ({ ...prev, sourceAmount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
              min="1"
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Searching...' : 'Find Routes'}
            </button>
          </div>
        </div>

        {/* Exchange Rate Display */}
        {exchangeRate > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                1 {searchParams.sourceCurrency} = {formatAmount(exchangeRate)} {searchParams.targetCurrency}
              </span>
              <span className="text-xs text-gray-500">
                Live exchange rate
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Routes Results */}
      {routes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-black">
            Found {routes.length} payment routes
          </h3>
          
          {routes.map((route, index) => (
            <div
              key={route.id}
              className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
                selectedRoute?.id === route.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleRouteSelect(route)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      index === 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black">
                      {route.provider.name}
                    </h4>
                    <p className="text-sm text-gray-600 capitalize">
                      {route.type.replace('_', ' ')} • {route.estimatedTime}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                    getConfidenceColor(route.confidence)
                  }`}>
                    {getConfidenceLabel(route.confidence)} Confidence
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Recipient Amount */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Recipient Gets</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatAmount(route.netRecipientAmount)} {route.targetCurrency}
                  </p>
                </div>

                {/* Total Fees */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Fees</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatAmount(route.fees.totalFees)} {route.sourceCurrency}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatPercentage((route.fees.totalFees / route.sourceAmount) * 100)} of amount
                  </p>
                </div>

                {/* Savings */}
                {index > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Savings vs Best</p>
                    <p className="text-lg font-semibold text-green-600">
                      -{formatAmount(routes[0].netRecipientAmount - route.netRecipientAmount)} {route.targetCurrency}
                    </p>
                  </div>
                )}
              </div>

              {/* Fee Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Fee Breakdown:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Stellar Fee:</span>
                    <span className="ml-1 font-medium">{formatAmount(route.fees.stellarFee)}</span>
                  </div>
                  {route.fees.anchorFee && (
                    <div>
                      <span className="text-gray-600">Anchor Fee:</span>
                      <span className="ml-1 font-medium">{formatAmount(route.fees.anchorFee)}</span>
                    </div>
                  )}
                  {route.fees.fxSpread && (
                    <div>
                      <span className="text-gray-600">FX Spread:</span>
                      <span className="ml-1 font-medium">{formatAmount(route.fees.fxSpread)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-1 font-medium">{formatAmount(route.fees.totalFees)}</span>
                  </div>
                </div>
              </div>

              {/* KYC Requirement */}
              {route.requiresKYC && (
                <div className="mt-3 flex items-center text-sm text-orange-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  KYC verification required
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Execute Payment Button */}
      {selectedRoute && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-black">Selected Route</h4>
              <p className="text-sm text-gray-600">
                {selectedRoute.provider.name} • {selectedRoute.netRecipientAmount} {selectedRoute.targetCurrency} to recipient
              </p>
            </div>
            <button
              onClick={handleExecutePayment}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Execute Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
