'use client';

import React from 'react';

interface SettingsProps {
  onTabChange?: (tab: string) => void;
}

export default function Settings({ onTabChange }: SettingsProps) {
  const disconnect = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('stellarAddress');
    localStorage.removeItem('publicKey');
    window.location.href = '/login';
  };

  return (
    <div className="h-full bg-white overflow-hidden">
      {/* Mobile & Tablet View - Stacked Layout */}
      <div className="lg:hidden h-full overflow-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-6">Wallet settings</h2>
        </div>

        {/* Hero Section */}
        <div className="space-y-4">
          <h3 className="text-2xl sm:text-3xl font-medium text-black leading-tight">Manage your wallet connection.</h3>
          <p className="text-gray-600 text-sm sm:text-base">Disconnect to remove your address from this device.</p>
          <button 
            onClick={() => onTabChange?.('Dashboard')}
            className="inline-flex items-center space-x-2 px-4 py-2 border-2 border-gray-900 bg-white text-black text-sm font-medium hover:bg-gray-900 hover:text-white transition-all duration-200"
          >
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Disconnect */}
        <div className="bg-gray-50 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">Disconnect wallet</h3>
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-6">This will remove your wallet address from this device and return you to the login screen.</p>
          <button onClick={disconnect} className="w-full bg-red-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors duration-200">Disconnect Wallet</button>
        </div>
      </div>

      {/* Desktop View - Two Column Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 h-full overflow-hidden">
        {/* Left Section - Fixed Hero Content */}
        <div className="flex flex-col justify-between p-6 xl:p-8 overflow-hidden">
          {/* Top Content */}
          <div className="space-y-6">
            <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-black">Wallet settings</h2>
          </div>

          {/* Bottom Hero Section */}
          <div className="space-y-4 xl:space-y-5 pb-4">
            <h3 className="text-2xl xl:text-3xl 2xl:text-4xl font-medium text-black leading-tight">Manage your wallet connection.</h3>
            <p className="text-gray-600 text-sm xl:text-base max-w-xl">Manage your wallet connection.</p>
            <button 
              onClick={() => onTabChange?.('Dashboard')}
              className="inline-flex items-center space-x-2 px-4 py-2 border-2 border-gray-900 bg-white text-black text-sm font-medium hover:bg-gray-900 hover:text-white transition-all duration-200"
            >
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Right Section - Disconnect */}
        <div className="bg-gray-50 p-6 xl:p-8 overflow-y-auto">
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-black">Disconnect wallet</h3>
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-8">This will remove your wallet address from this device and return you to the login screen.</p>
            <button onClick={disconnect} className="w-full bg-red-600 text-white px-5 py-3 text-sm font-medium hover:bg-red-700 transition-colors duration-200">Disconnect Wallet</button>
          </div>
        </div>
      </div>
    </div>
  );
}
