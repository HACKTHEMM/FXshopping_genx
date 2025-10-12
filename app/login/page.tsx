"use client";

import { useEffect, useState } from 'react';
import { isConnected, requestAccess } from '@stellar/freighter-api';

export default function LoginPage() {
  const [hasFreighter, setHasFreighter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkFreighterInstalled();
  }, []);

  const checkFreighterInstalled = async () => {
    try {
      const result = await isConnected();
      setHasFreighter(result.isConnected);
      setIsLoading(false);
    } catch (err) {
      console.error('Error checking Freighter:', err);
      setHasFreighter(false);
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError('');
      const result = await requestAccess();
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      if (result.address) {
        // Store the address in localStorage or state management
        localStorage.setItem('stellarAddress', result.address);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Checking for Freighter...</div>
      </div>
    );
  }

  if (!hasFreighter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Freighter Not Detected</h1>
        <p className="mb-4 text-center">
          Please install the Freighter wallet extension to continue.
        </p>
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Install Freighter
        </a>
        <button
          onClick={checkFreighterInstalled}
          className="mt-4 text-blue-600 underline"
        >
          I&apos;ve installed it, check again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Connect Your Wallet</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleLogin}
        className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg hover:bg-purple-700"
      >
        Connect Freighter Wallet
      </button>
    </div>
  );
}
