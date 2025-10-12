'use client';

import { useState, useEffect } from 'react';
// Using window.freighterApi to avoid TypeScript type issues with various package exports

interface LoginProps {
  onLogin: (publicKey: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem('publicKey');
    if (existing) {
      onLogin(existing);
    }
  }, [onLogin]);

  const connectFreighter = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const freighter = (typeof window !== 'undefined' && (window as { freighterApi?: unknown }).freighterApi) as {
        isConnected?: () => Promise<boolean>;
        getPublicKey?: () => Promise<string>;
        requestAccess?: () => Promise<void>;
      } | undefined;
      if (!freighter || typeof freighter.isConnected !== 'function') {
        setError('Freighter extension not detected. Please install it and try again.');
        return;
      }
      const available = await freighter.isConnected();
      if (!available) {
        setError('Freighter is not connected. Please ensure the extension is enabled.');
        return;
      }
      if (typeof freighter.requestAccess === 'function') {
        await freighter.requestAccess();
      }
      const pubKey: string | undefined = await freighter.getPublicKey?.();
      if (pubKey) {
        localStorage.setItem('publicKey', pubKey);
        localStorage.setItem('isAuthenticated', 'true');
        onLogin(pubKey);
      } else {
        setError('Failed to retrieve wallet address.');
      }
    } catch (_e) {
      setError('Freighter not available or access denied. Please install or allow it.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-2">
            LumenFX
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Connect your Stellar Freighter wallet to continue.
          </p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <button
            onClick={connectFreighter}
            disabled={isConnecting}
            className="w-full bg-black text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium hover:bg-gray-800 active:bg-gray-900 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <img src="/stellar-xlm-logo.png" alt="Stellar" className="w-4 h-4" />
                <span>Connect with Freighter</span>
              </>
            )}
          </button>

          {error && (
            <p className="text-red-600 text-xs sm:text-sm mt-4 text-center">{error}</p>
          )}
        </div>

        <div className="mt-6 sm:mt-8 text-center px-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            You need the Freighter wallet extension installed in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
