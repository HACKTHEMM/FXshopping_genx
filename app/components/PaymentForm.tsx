'use client';

import { useState } from 'react';
import { RouteQuote, StellarAsset } from '@/lib/types/route';

interface PaymentFormProps {
  onRoutesFound?: (routes: RouteQuote[]) => void;
  publicKey?: string;
}

interface Currency {
  code: string;
  name: string;
  isFiat: boolean;
  stellarAsset?: StellarAsset;
}

// Real testnet issuer - created via scripts/setup-stellar-assets.js
const TESTNET_ISSUER = 'GAYYZIK2JL6446376R5ZFRPCGNJ4EH2M7TFARTRFVURMW3AMMLU32RUC';

const SUPPORTED_CURRENCIES: Currency[] = [
  { 
    code: 'INR', 
    name: 'Indian Rupee', 
    isFiat: true,
    stellarAsset: { code: 'INRTEST', issuer: TESTNET_ISSUER }
  },
  { 
    code: 'USD', 
    name: 'US Dollar', 
    isFiat: true,
    stellarAsset: { code: 'USDTEST', issuer: TESTNET_ISSUER }
  },
  { 
    code: 'EUR', 
    name: 'Euro', 
    isFiat: true,
    stellarAsset: { code: 'EURTEST', issuer: TESTNET_ISSUER }
  },
  { 
    code: 'PHP', 
    name: 'Philippine Peso', 
    isFiat: true,
    stellarAsset: { code: 'PHPTEST', issuer: TESTNET_ISSUER }
  },
  { 
    code: 'XLM', 
    name: 'Stellar Lumens', 
    isFiat: false,
    stellarAsset: { code: 'XLM' }
  },
];

export default function PaymentForm({ onRoutesFound, publicKey }: PaymentFormProps) {
  const [sourceCurrency, setSourceCurrency] = useState<Currency>(SUPPORTED_CURRENCIES[0]);
  const [destCurrency, setDestCurrency] = useState<Currency>(SUPPORTED_CURRENCIES[1]);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const sendAmount = parseFloat(amount);
      if (isNaN(sendAmount) || sendAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (sourceCurrency.code === destCurrency.code) {
        throw new Error('Source and destination currencies must be different');
      }

      // Build request payload
      const payload = {
        sourceAsset: sourceCurrency.stellarAsset,
        destAsset: destCurrency.stellarAsset,
        sendAmount,
        senderAddress: publicKey || undefined,
        destinationAddress: recipientAddress || undefined,
        sourceFiat: sourceCurrency.isFiat ? sourceCurrency.code : undefined,
        destFiat: destCurrency.isFiat ? destCurrency.code : undefined,
      };

      const response = await fetch('/api/routes/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch routes');
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        onRoutesFound?.(data.routes);
      } else {
        setError('No routes found for this currency pair. Try a different combination.');
      }

    } catch (err: any) {
      console.error('Payment form error:', err);
      setError(err.message || 'An error occurred while searching for routes');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    const temp = sourceCurrency;
    setSourceCurrency(destCurrency);
    setDestCurrency(temp);
  };

  return (
    <div className="bg-white border border-gray-200 p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-1 md:mb-2">Send Payment</h2>
        <p className="text-xs md:text-sm text-gray-600">
          Compare FX routes across multiple providers and the Stellar network
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-black mb-2">
            Send Amount
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-base md:text-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Source Currency */}
        <div>
          <label htmlFor="sourceCurrency" className="block text-sm font-medium text-black mb-2">
            From Currency
          </label>
          <select
            id="sourceCurrency"
            value={sourceCurrency.code}
            onChange={(e) => {
              const currency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
              if (currency) setSourceCurrency(currency);
            }}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-sm md:text-base bg-white focus:outline-none focus:border-blue-500"
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2 md:-my-3">
          <button
            type="button"
            onClick={swapCurrencies}
            className="p-2 md:p-2.5 text-gray-600 hover:text-black hover:bg-gray-100 transition-colors border border-gray-300"
            title="Swap currencies"
            aria-label="Swap currencies"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Destination Currency */}
        <div>
          <label htmlFor="destCurrency" className="block text-sm font-medium text-black mb-2">
            To Currency
          </label>
          <select
            id="destCurrency"
            value={destCurrency.code}
            onChange={(e) => {
              const currency = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
              if (currency) setDestCurrency(currency);
            }}
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black text-sm md:text-base bg-white focus:outline-none focus:border-blue-500"
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Address (Optional) */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-black mb-2">
            Recipient Address <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="G..."
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 text-black font-mono text-xs md:text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to compare routes without a specific recipient
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Finding best routes...
            </span>
          ) : (
            'Find Best Routes'
          )}
        </button>
      </form>

      {/* Disclaimer */}
      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
        <p className="text-xs leading-relaxed text-gray-500">
          <strong className="text-gray-700">Demo Notice:</strong> Fiat on/off-ramp steps are simulated for hackathon scope. 
          All path discovery, settlement, and contract attestations run on Stellar testnet. 
          Architecture is anchor-ready.
        </p>
      </div>
    </div>
  );
}
