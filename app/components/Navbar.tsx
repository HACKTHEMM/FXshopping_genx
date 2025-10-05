'use client';

import { useState } from 'react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
}

export default function Navbar({ activeTab, onTabChange, onLogout }: NavbarProps) {
  return (
    <header className="bg-white px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold text-black">LumenFX </h1>
          <nav className="hidden md:flex space-x-8">
            {['Dashboard', 'Transactions', 'Settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab
                    ? 'text-blue-600'
                    : 'text-black hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 border border-gray-200 rounded-lg">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Ethereum</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden sm:flex items-center space-x-2">
            {/* <span className="text-sm text-gray-600">Your wallet address</span> */}
            <span className="text-sm font-mono text-black">0x62D58207...6987f3588</span>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
