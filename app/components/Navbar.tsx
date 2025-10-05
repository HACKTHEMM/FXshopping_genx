'use client';

import { useState } from 'react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
}

export default function Navbar({ activeTab, onTabChange, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <header className="bg-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 border-b border-gray-100">
      <div className="flex items-center justify-between">
        {/* Left Section: Logo and Desktop Navigation */}
        <div className="flex items-center space-x-4 lg:space-x-8">
          {/* Logo */}
          <h1 className="text-xl sm:text-2xl font-bold text-black whitespace-nowrap">LumenFX</h1>
          
          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden md:flex space-x-4 lg:space-x-8">
            {['Dashboard', 'Transactions', 'Settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
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
          
          {/* Stellar Badge - Hidden on mobile and tablet */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 border border-gray-200 rounded-lg">
            <img
              src="/stellar-xlm-logo.png"
              alt="Stellar Logo"
              className="w-4 h-4 object-contain"
            />
            <span className="text-sm text-gray-700">Stellar</span>
          </div>
        </div>

        {/* Right Section: Wallet Address and Logout */}
        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
          {/* Wallet Address - Responsive */}
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-mono text-black truncate max-w-[160px] sm:max-w-none">
              {typeof window !== 'undefined' ? (() => {
                const addr = localStorage.getItem('stellarAddress') || localStorage.getItem('publicKey') || '';
                return addr ? addr.slice(0, 6) + '...' + addr.slice(-6) : '';
              })() : ''}
            </span>
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          
          {/* Logout Button - Desktop */}
          <button 
            onClick={onLogout}
            className="hidden sm:flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span className="hidden lg:inline">Logout</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Slides down when open */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col space-y-1 pt-4 pb-2 border-t border-gray-100 mt-3">
          {/* Mobile Navigation Links */}
          {['Dashboard', 'Transactions', 'Settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-black hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}

          {/* Mobile Stellar Badge */}
          <div className="flex items-center space-x-2 px-3 py-2.5 mt-2">
            <img
              src="/stellar-xlm-logo.png"
              alt="Stellar Logo"
              className="w-4 h-4 object-contain"
            />
            <span className="text-sm text-gray-700">Stellar</span>
          </div>

          {/* Mobile Wallet Address */}
          <div className="sm:hidden flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg mt-2">
            <span className="text-xs font-mono text-black truncate">
              {typeof window !== 'undefined' ? (() => {
                const addr = localStorage.getItem('stellarAddress') || localStorage.getItem('publicKey') || '';
                return addr ? addr.slice(0, 6) + '...' + addr.slice(-6) : '';
              })() : ''}
            </span>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Mobile Logout Button */}
          <button 
            onClick={() => {
              onLogout?.();
              setMobileMenuOpen(false);
            }}
            className="sm:hidden flex items-center space-x-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 mt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
