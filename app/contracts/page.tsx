'use client';

import ContractBuilder from '@/app/components/ContractBuilder';
import { useEffect, useState } from 'react';

interface FreighterAPI {
  getPublicKey: () => Promise<string>;
}

declare global {
  interface Window {
    freighter?: FreighterAPI;
  }
}

export default function ContractsPage() {
  const [publicKey, setPublicKey] = useState<string>();

  useEffect(() => {
    // Check if Freighter is installed and connected
    const checkWallet = async () => {
      if (typeof window !== 'undefined' && window.freighter) {
        try {
          const key = await window.freighter.getPublicKey();
          setPublicKey(key);
        } catch {
          console.log('Wallet not connected');
        }
      }
    };
    checkWallet();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <ContractBuilder publicKey={publicKey} />
    </main>
  );
}
