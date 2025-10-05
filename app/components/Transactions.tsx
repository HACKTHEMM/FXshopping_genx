'use client';

import { useState } from 'react';

interface Transaction {
  id: string;
  type: 'wallet-to-payout' | 'savings-to-wallet' | 'wallet-to-savings' | 'deposit-to-wallet';
  amount: number;
  currency: string;
  date: string;
  time: string;
  hash: string;
}

const transactions: Transaction[] = [
  {
    id: '1',
    type: 'wallet-to-payout',
    amount: 49500,
    currency: 'USDC',
    date: '28/03/25',
    time: '4:12 PM',
    hash: '0xc817d3feaf90de3dbc...a2f213'
  },
  {
    id: '2',
    type: 'savings-to-wallet',
    amount: 21000,
    currency: 'USDC',
    date: '28/03/25',
    time: '2:01 PM',
    hash: '0xa1b2c3d4e5f6789...b3c4d5e6'
  },
  {
    id: '3',
    type: 'wallet-to-savings',
    amount: 149576,
    currency: 'USDC',
    date: '27/03/25',
    time: '11:49 AM',
    hash: '0xf9e8d7c6b5a493...8271f0e9'
  },
  {
    id: '4',
    type: 'deposit-to-wallet',
    amount: 140557,
    currency: 'USDC',
    date: '27/03/25',
    time: '10:28 AM',
    hash: '0x1234567890abcdef...fedcba0987'
  },
  {
    id: '5',
    type: 'wallet-to-payout',
    amount: 35000,
    currency: 'USDC',
    date: '26/03/25',
    time: '3:45 PM',
    hash: '0xabcdef123456...987654fedcba'
  },
  {
    id: '6',
    type: 'deposit-to-wallet',
    amount: 50000,
    currency: 'USDC',
    date: '25/03/25',
    time: '9:30 AM',
    hash: '0x9876543210...abcdef123456'
  }
];

const getTransactionTypeInfo = (type: Transaction['type']) => {
  switch (type) {
    case 'wallet-to-payout':
      return { from: 'Wallet', to: 'Payout', fromColor: 'bg-blue-100 text-blue-700', toColor: 'bg-blue-100 text-blue-700' };
    case 'savings-to-wallet':
      return { from: 'Savings', to: 'Wallet', fromColor: 'bg-green-100 text-green-700', toColor: 'bg-blue-100 text-blue-700' };
    case 'wallet-to-savings':
      return { from: 'Wallet', to: 'Savings', fromColor: 'bg-blue-100 text-blue-700', toColor: 'bg-green-100 text-green-700' };
    case 'deposit-to-wallet':
      return { from: 'Deposit', to: 'Wallet', fromColor: 'bg-green-100 text-green-700', toColor: 'bg-blue-100 text-blue-700' };
    default:
      return { from: '', to: '', fromColor: '', toColor: '' };
  }
};

const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
  const typeInfo = getTransactionTypeInfo(transaction.type);
  
  return (
    <div className="bg-white border border-gray-200 p-4 lg:p-5 hover:shadow-sm transition-shadow">
      {/* Transaction Type Tags and Time */}
      <div className="flex items-start justify-between mb-3 lg:mb-4">
        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 text-xs font-medium ${typeInfo.fromColor}`}>
            {typeInfo.from}
          </span>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className={`px-2.5 py-1 text-xs font-medium ${typeInfo.toColor}`}>
            {typeInfo.to}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-gray-500 flex-shrink-0 ml-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="whitespace-nowrap">{transaction.date}, {transaction.time}</span>
        </div>
      </div>
      
      {/* Amount */}
      <div className="mb-3 lg:mb-4">
        <div className="text-2xl lg:text-3xl font-bold text-black">
          {transaction.amount.toLocaleString()} {transaction.currency}
        </div>
      </div>
      
      {/* Transaction Hash */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono text-gray-500 truncate">{transaction.hash}</span>
        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function Transactions() {
  const [timeFilter, setTimeFilter] = useState('Last 30 days');
  const [currencyFilter, setCurrencyFilter] = useState('USDC');

  return (
    <div className="h-full bg-white overflow-hidden">
      {/* Mobile & Tablet View - Stacked Layout */}
      <div className="lg:hidden h-full overflow-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header and Filters */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            Your transaction history.
          </h1>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-4 py-2 text-black border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
              <option>All time</option>
            </select>
            <select 
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="px-4 py-2 text-black border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>USDC</option>
              <option>USD</option>
              <option>ETH</option>
            </select>
          </div>
        </div>

        {/* Promotional Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-medium text-black leading-tight">
              You're building momentum.
            </h2>
            <div className="text-2xl sm:text-3xl font-medium leading-tight">
              <span className="text-black">Keep your </span>
              <span className="text-blue-600">Savings growing.</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">
            Every deposit makes a difference — reinvest to grow even more.
          </p>
          <button className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-900 bg-white text-black text-sm font-medium hover:bg-gray-900 hover:text-white transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Deposit 100 USDC</span>
          </button>
        </div>

        {/* Transaction List */}
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>

      {/* Desktop View - Two Column Layout with Fixed Left, Scrollable Right */}
      <div className="hidden lg:grid lg:grid-cols-12 h-full overflow-hidden">
        {/* Left Section - Fixed, No Scroll */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between p-6 xl:p-8 overflow-hidden">
          {/* Top Content */}
          <div className="space-y-6 xl:space-y-8">
            <div>
              <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-black mb-6">
                Your transaction history.
              </h1>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select 
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-4 py-2 text-black border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>Last 90 days</option>
                  <option>All time</option>
                </select>
                <select 
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="px-4 py-2 text-black border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>USDC</option>
                  <option>USD</option>
                  <option>ETH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Content - Hero Section */}
          <div className="space-y-4 xl:space-y-5 pb-4">
            <div className="space-y-2">
              <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-medium text-black leading-tight">
                You're building momentum.
              </h2>
              <div className="text-2xl xl:text-3xl 2xl:text-4xl font-medium leading-tight">
                <span className="text-black">Keep your </span>
                <span className="text-blue-600">Savings growing.</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm xl:text-base">
              Every deposit makes a difference — reinvest to grow even more.
            </p>
            <button className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-900 bg-white text-black text-sm font-medium hover:bg-gray-900 hover:text-white transition-all duration-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Deposit 100 USDC</span>
            </button>
          </div>
        </div>

        {/* Right Section - Scrollable Transaction List */}
        <div className="lg:col-span-7 xl:col-span-7 bg-gray-50 h-full overflow-y-auto">
          <div className="p-6 xl:p-8 space-y-4">
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
