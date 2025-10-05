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
  }
];

const getTransactionTypeInfo = (type: Transaction['type']) => {
  switch (type) {
    case 'wallet-to-payout':
      return { from: 'Wallet', to: 'Payout', fromColor: 'bg-blue-100 text-blue-800', toColor: 'bg-blue-100 text-blue-800' };
    case 'savings-to-wallet':
      return { from: 'Savings', to: 'Wallet', fromColor: 'bg-green-100 text-green-800', toColor: 'bg-blue-100 text-blue-800' };
    case 'wallet-to-savings':
      return { from: 'Wallet', to: 'Savings', fromColor: 'bg-blue-100 text-blue-800', toColor: 'bg-green-100 text-green-800' };
    case 'deposit-to-wallet':
      return { from: 'Deposit', to: 'Wallet', fromColor: 'bg-green-100 text-green-800', toColor: 'bg-blue-100 text-blue-800' };
    default:
      return { from: '', to: '', fromColor: '', toColor: '' };
  }
};

const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
  const typeInfo = getTransactionTypeInfo(transaction.type);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      {/* Transaction Type Tags */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.fromColor}`}>
            {typeInfo.from}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.toColor}`}>
            {typeInfo.to}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{transaction.date}, {transaction.time}</span>
        </div>
      </div>
      
      {/* Amount */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-black">
          {transaction.amount.toLocaleString()} {transaction.currency}
        </div>
      </div>
      
      {/* Transaction Hash */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-mono text-gray-600">{transaction.hash}</span>
        <button className="p-1 text-gray-400 hover:text-gray-600">
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
    <div className="min-h-screen bg-white">
      <main className="px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Section */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-black mb-6">Your transaction history.</h1>
              
              {/* Filters */}
              <div className="flex space-x-4 mb-8">
                <select 
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>Last 90 days</option>
                  <option>All time</option>
                </select>
                <select 
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>USDC</option>
                  <option>USD</option>
                  <option>ETH</option>
                </select>
              </div>
            </div>

            {/* Promotional Section */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-black">
                You're building momentum.
              </h2>
              <div className="text-4xl font-bold">
                <span className="text-black">Keep your </span>
                <span className="text-blue-600">Savings growing.</span>
              </div>
              <p className="text-gray-600 text-lg">
                Every deposit makes a difference — reinvest to grow even more.
              </p>
              <button className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-black font-medium hover:bg-gray-50 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Deposit 100 USDC</span>
              </button>
            </div>
          </div>

          {/* Right Section - Transaction List */}
          <div>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
