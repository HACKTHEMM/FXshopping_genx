'use client';

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Transactions from './components/Transactions';
import Settings from './components/Settings';
import Login from './components/Login';

const savingsData = [
  { month: 'Jan', amount: 50 },
  { month: 'Feb', amount: 67 },
  { month: 'Mar', amount: 109 },
  { month: 'Apr', amount: 149 },
  { month: 'May', amount: 152 },
  { month: 'Jun', amount: 156 },
  { month: 'Jul', amount: 164 },
  { month: 'Aug', amount: 201 },
  { month: 'Sep', amount: 212 },
  { month: 'Oct', amount: 238 },
  { month: 'Nov', amount: 241 },
  { month: 'Dec', amount: 263 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const maxAmount = Math.max(...savingsData.map(d => d.amount));

  useEffect(() => {
    // Check if user is authenticated (you can implement proper auth logic here)
    const authStatus = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  const handleLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Transactions':
        return <Transactions />;
      case 'Settings':
        return <Settings onTabChange={setActiveTab} />;
      case 'Dashboard':
      default:
        return (
          <main className="h-full px-8 py-6 overflow-hidden">
            <div className="h-full grid grid-cols-12 grid-rows-[auto,1fr] gap-6 pb-10">
              {/* Section Title top-left */}
              <div className="col-span-5">
                <h2 className="text-4xl font-bold text-black">Wallet & Savings</h2>
              </div>

              {/* Savings chart top-right */}
              <div className="col-span-12 lg:col-start-8 lg:col-span-5 row-start-1 bg-white shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Savings projection</h3>
                    <p className="text-gray-500 text-xs">Projection based on average historical growth in FxShopping.</p>
                  </div>
                  <div className="flex space-x-2">
                    <select className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>This year</option>
                      <option>Last year</option>
                    </select>
                    <select className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>USDC</option>
                      <option>USD</option>
                    </select>
                  </div>
                </div>
                <div className="h-40 md:h-48 lg:h-56 flex items-end justify-between space-x-1">
                  {savingsData.map((item) => (
                    <div key={item.month} className="flex flex-col items-center flex-1">
                      <div className="text-[10px] font-medium text-gray-600 mb-1">{item.amount}k</div>
                      <div
                        className="bg-gradient-to-t from-purple-400 to-purple-300 w-full"
                        style={{ height: `${(item.amount / maxAmount) * 150}px` }}
                      ></div>
                      <div className="text-[10px] text-gray-500 mt-1">{item.month}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom-left hero text */}
              <div className="col-span-12 lg:col-span-5 row-start-2 flex flex-col justify-end">
                <div className="space-y-3">
                  <h3 className="text-2xl md:text-5xl lg:text-6xl font-medium text-black leading-[1.05]">
                    Great! <span className="text-blue-600">Savings increased by 13,8%</span> in the
                    <br /> past 30 days.
                  </h3>
                  <p className="text-gray-600 text-base">
                    Top up your Wallet and start growing your Savings automatically.
                  </p>
                  <button className="w-max bg-black text-white px-6 py-3 font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center space-x-2">
                    <span>Add Funds to Wallet</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bottom-right cards next to the text */}
              <div className="col-span-12 lg:col-start-7 lg:col-span-6 row-start-2 grid grid-cols-2 gap-4 content-end">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Wallet</h3>
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 mb-1">Balance</div>
                    <div className="text-3xl font-bold text-gray-900">12,981</div>
                    <div className="text-xs text-gray-600">USDC</div>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Your average deposit amount is <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">1,200 USDC</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full bg-black text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Deposit Funds</span>
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Payout</span>
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Savings</h3>
                    <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 mb-1">Aave</div>
                    <div className="text-3xl font-bold text-gray-900">149,576</div>
                    <div className="text-xs text-gray-600">USDC</div>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Your average savings growth is <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs font-medium">138.60 USDC</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full bg-black text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Add Funds from Wallet</span>
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
}