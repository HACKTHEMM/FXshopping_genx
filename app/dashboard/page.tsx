'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Transactions from '../components/Transactions';
import Settings from '../components/Settings';
import Routes from '../components/Routes';
import ContractBuilder from '../components/ContractBuilder';

// Calculate balance history from payment operations
const calculateBalanceHistory = async (publicKey: string) => {
  try {
    const response = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${publicKey}/payments?order=desc&limit=200`
    );
    const data = await response.json();
    
    // Get current balance
    const accountResponse = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    const accountData = await accountResponse.json();
    const currentXLM = accountData.balances.find((b: { asset_type: string; balance?: string }) => b.asset_type === 'native')?.balance || '0';
    
    let balance = parseFloat(currentXLM);
    const history: { month: string; amount: number }[] = [];
    const monthlyBalances: { [key: string]: number } = {};
    
    // Process payments in reverse to build history
    const records = data.records || [];
    
    for (const record of records) {
      const date = new Date(record.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyBalances[monthKey]) {
        monthlyBalances[monthKey] = balance;
      }
      
      // Adjust balance backwards
      if (record.to === publicKey) {
        balance -= parseFloat(record.amount || '0');
      } else if (record.from === publicKey) {
        balance += parseFloat(record.amount || '0');
      }
    }
    
    // Convert to chart format (last 12 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    for (let i = 11; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
      const monthKey = `${months[monthIndex]} ${year}`;
      
      history.push({
        month: months[monthIndex],
        amount: Math.round(monthlyBalances[monthKey] || parseFloat(currentXLM))
      });
    }
    
    return history.length > 0 ? history : [
      { month: months[currentMonth], amount: Math.round(parseFloat(currentXLM)) }
    ];
  } catch (error) {
    console.error('Error calculating balance history:', error);
    return [];
  }
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const [xlmBalance, setXlmBalance] = useState<string>('0');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [balanceHistory, setBalanceHistory] = useState<Array<{ month: string; amount: number }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const horizonUrl = 'https://horizon-testnet.stellar.org';

  const maxAmount = balanceHistory.length > 0 
    ? Math.max(...balanceHistory.map(d => d.amount))
    : 100;

  useEffect(() => {
    const storedAddress = localStorage.getItem('stellarAddress');
    const fallbackPublicKey = localStorage.getItem('publicKey');
    const key = storedAddress || fallbackPublicKey;
    setPublicKey(key);
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) return;
      try {
        const res = await fetch(`${horizonUrl}/accounts/${publicKey}`);
        const data = await res.json();
        const balances = (data.balances || []) as Array<{ asset_type: string; asset_code?: string; balance: string }>;
        const native = balances.find(b => b.asset_type === 'native');
        const usdc = balances.find(b => b.asset_code === 'USDC');
        setXlmBalance(native?.balance || '0');
        setUsdcBalance(usdc?.balance || '0');
        
        // Fetch balance history
        setIsLoadingHistory(true);
        const history = await calculateBalanceHistory(publicKey);
        setBalanceHistory(history);
        setIsLoadingHistory(false);
      } catch {
        setXlmBalance('0');
        setUsdcBalance('0');
        setIsLoadingHistory(false);
      }
    };
    fetchBalances();
  }, [publicKey]);

  const handleLogout = () => {
    localStorage.removeItem('stellarAddress');
    localStorage.removeItem('publicKey');
    setPublicKey(null);
    window.location.href = '/login';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Routes':
        return (
          <div className="h-full overflow-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
            <div className="max-w-[1400px] mx-auto">
              <Routes publicKey={publicKey || undefined} />
            </div>
          </div>
        );
      case 'Contracts':
        return (
          <div className="h-full overflow-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
            <div className="max-w-[1400px] mx-auto">
              <ContractBuilder publicKey={publicKey || undefined} />
            </div>
          </div>
        );
      case 'Transactions':
        return <Transactions address={publicKey || undefined} />;
      case 'Settings':
        return <Settings onTabChange={setActiveTab} />;
      case 'Dashboard':
      default:
        return (
          <main className="h-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-4 overflow-auto lg:overflow-hidden">
            <div className="max-w-[1400px] mx-auto h-full">
              {/* Mobile Layout */}
              <div className="flex flex-col md:hidden space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-black">Wallet & Savings</h2>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-black leading-tight">
                    Wallet Balance: <span className="text-blue-600">{parseFloat(xlmBalance).toFixed(2)} XLM</span>
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Track your XLM balance growth and manage your Stellar assets.
                  </p>
                  <button className="w-full bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                    <span>Add Funds to Wallet</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Balance History Chart - Mobile */}
                <div className="bg-white shadow-sm border border-gray-100 p-4">
                  <div className="flex flex-col space-y-2 mb-3">
                    <h3 className="text-base font-semibold text-gray-900">XLM Balance History</h3>
                    <p className="text-gray-500 text-xs">Your wallet balance over time</p>
                  </div>
                  {isLoadingHistory ? (
                    <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                      Loading history...
                    </div>
                  ) : balanceHistory.length > 0 ? (
                    <div className="h-32 flex items-end justify-between space-x-1">
                      {balanceHistory.map((item) => (
                        <div key={item.month} className="flex flex-col items-center flex-1">
                          <div className="text-[9px] font-medium text-gray-600 mb-1">{item.amount}</div>
                          <div
                            className="bg-gradient-to-t from-blue-500 to-blue-300 w-full"
                            style={{ height: `${(item.amount / maxAmount) * 100}px` }}
                          ></div>
                          <div className="text-[9px] text-gray-500 mt-1">{item.month}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                      No balance history available
                    </div>
                  )}
                </div>

                {/* Wallet Card - Mobile with XLM */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">Wallet</h3>
                    <div className="w-8 h-8 bg-blue-200 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">XLM Balance</div>
                      <div className="text-2xl font-bold text-gray-900">{parseFloat(xlmBalance).toFixed(4)}</div>
                      <div className="text-xs text-gray-600">XLM</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">USDC Balance</div>
                      <div className="text-xl font-bold text-gray-900">{Number(usdcBalance).toLocaleString()}</div>
                      <div className="text-xs text-gray-600">USDC</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full bg-black text-white py-2 text-sm font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Deposit Funds</span>
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Payout</span>
                    </button>
                  </div>
                </div>

                {/* Savings Card - Mobile */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">Savings</h3>
                    <div className="w-8 h-8 bg-green-200 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Aave</div>
                    <div className="text-2xl font-bold text-gray-900">149,576</div>
                    <div className="text-xs text-gray-600">USDC</div>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-gray-600">
                      Your average savings growth is <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs font-medium">138.60 USDC</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full bg-black text-white py-2 text-sm font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Add Funds from Wallet</span>
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Layout: 1024px+ */}
              <div className="hidden lg:grid h-full grid-cols-12 grid-rows-[auto,1fr] gap-3 xl:gap-4">
                <div className="col-span-12 lg:col-span-5 xl:col-span-5 order-1">
                  <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-black">Wallet & Savings</h2>
                </div>

                {/* Balance History Chart - Desktop */}
                <div className="col-span-12 lg:col-start-7 lg:col-span-6 xl:col-start-8 xl:col-span-5 row-start-1 order-2 bg-white shadow-sm border border-gray-100 p-3 xl:p-4 2xl:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm xl:text-base 2xl:text-lg font-semibold text-gray-900">XLM Balance History</h3>
                      <p className="text-gray-500 text-[10px] xl:text-xs">Your wallet balance over time</p>
                    </div>
                  </div>
                  {isLoadingHistory ? (
                    <div className="h-32 xl:h-40 2xl:h-52 flex items-center justify-center text-gray-400">
                      Loading...
                    </div>
                  ) : balanceHistory.length > 0 ? (
                    <div className="h-32 xl:h-40 2xl:h-52 flex items-end justify-between space-x-1">
                      {balanceHistory.map((item) => (
                        <div key={item.month} className="flex flex-col items-center flex-1">
                          <div className="text-[9px] xl:text-[10px] font-medium text-gray-600 mb-1">{item.amount}</div>
                          <div
                            className="bg-gradient-to-t from-blue-500 to-blue-300 w-full"
                            style={{ height: `${(item.amount / maxAmount) * 160}px` }}
                          ></div>
                          <div className="text-[9px] xl:text-[10px] text-gray-500 mt-1">{item.month}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 xl:h-40 2xl:h-52 flex items-center justify-center text-gray-400">
                      No balance history
                    </div>
                  )}
                </div>

                <div className="col-span-12 lg:col-span-5 xl:col-span-5 row-start-2 order-1 lg:order-none flex flex-col justify-end pb-2">
                  <div className="space-y-2 xl:space-y-3">
                    <h3 className="text-xl xl:text-2xl 2xl:text-4xl 3xl:text-5xl font-medium text-black leading-[1.05]">
                      Wallet Balance: <span className="text-blue-600">{parseFloat(xlmBalance).toFixed(2)} XLM</span>
                    </h3>
                    <p className="text-gray-600 text-xs xl:text-sm 2xl:text-base">
                      Track your XLM balance growth and manage your Stellar assets efficiently.
                    </p>
                    <button className="w-max bg-black text-white px-4 xl:px-5 2xl:px-6 py-2 xl:py-2.5 2xl:py-3 text-xs xl:text-sm 2xl:text-base font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center space-x-2">
                      <span>Add Funds to Wallet</span>
                      <svg className="w-3 xl:w-4 2xl:w-5 h-3 xl:h-4 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="col-span-12 lg:col-start-7 lg:col-span-6 xl:col-start-7 xl:col-span-6 row-start-2 order-3 grid grid-cols-1 md:grid-cols-2 gap-3 xl:gap-4 content-end pb-2">
                  {/* Wallet Card with XLM and USDC */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 xl:p-4 2xl:p-5 border border-blue-200">
                    <div className="flex items-center justify-between mb-2 xl:mb-3">
                      <h3 className="text-sm xl:text-base 2xl:text-lg font-semibold text-gray-900">Wallet</h3>
                      <div className="w-8 xl:w-9 2xl:w-10 h-8 xl:h-9 2xl:h-10 bg-blue-200 flex items-center justify-center">
                        <svg className="w-4 xl:w-4 2xl:w-5 h-4 xl:h-4 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-2 mb-2 xl:mb-3">
                      <div>
                        <div className="text-[10px] xl:text-xs text-gray-600 mb-1">XLM Balance</div>
                        <div className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900">{parseFloat(xlmBalance).toFixed(4)}</div>
                        <div className="text-[10px] xl:text-xs text-gray-600">XLM</div>
                      </div>
                      <div>
                        <div className="text-[10px] xl:text-xs text-gray-600 mb-1">USDC Balance</div>
                        <div className="text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-900">{Number(usdcBalance).toLocaleString()}</div>
                        <div className="text-[10px] xl:text-xs text-gray-600">USDC</div>
                      </div>
                    </div>
                    <div className="space-y-1.5 xl:space-y-2">
                      <button className="w-full bg-black text-white py-1.5 xl:py-2 2xl:py-2.5 text-xs xl:text-sm font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                        <svg className="w-3 xl:w-4 2xl:w-5 h-3 xl:h-4 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Deposit Funds</span>
                      </button>
                      <button className="w-full border border-gray-300 text-gray-700 py-1.5 xl:py-2 2xl:py-2.5 text-xs xl:text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                        <svg className="w-3 xl:w-4 2xl:w-5 h-3 xl:h-4 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Payout</span>
                      </button>
                    </div>
                  </div>

                  {/* Savings Card */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 xl:p-4 2xl:p-5 border border-green-200">
                    <div className="flex items-center justify-between mb-2 xl:mb-3">
                      <h3 className="text-sm xl:text-base 2xl:text-lg font-semibold text-gray-900">Savings</h3>
                      <div className="w-8 xl:w-9 2xl:w-10 h-8 xl:h-9 2xl:h-10 bg-green-200 flex items-center justify-center">
                        <svg className="w-4 xl:w-4 2xl:w-5 h-4 xl:h-4 2xl:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="mb-2 xl:mb-3">
                      <div className="text-[10px] xl:text-xs text-gray-600 mb-1">Aave</div>
                      <div className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900">149,576</div>
                      <div className="text-[10px] xl:text-xs text-gray-600">USDC</div>
                    </div>
                    <div className="mb-2 xl:mb-3">
                      <p className="text-[10px] xl:text-xs 2xl:text-sm text-gray-600">
                        Your average savings growth is <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded text-[10px] xl:text-xs font-medium">138.60 USDC</span>
                      </p>
                    </div>
                    <div className="space-y-1.5 xl:space-y-2">
                      <button className="w-full bg-black text-white py-1.5 xl:py-2 2xl:py-2.5 text-xs xl:text-sm font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2">
                        <svg className="w-3 xl:w-4 2xl:w-5 h-3 xl:h-4 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span>Add Funds from Wallet</span>
                      </button>
                      <button className="w-full border border-gray-300 text-gray-700 py-1.5 xl:py-2 2xl:py-2.5 text-xs xl:text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2">
                        <svg className="w-3 xl:w-4 2xl:w-5 h-3 xl:h-4 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Withdraw</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        );
    }
  };

  useEffect(() => {
    if (!isCheckingAuth && !publicKey) {
      router.replace('/login');
    }
  }, [publicKey, isCheckingAuth, router]);

  if (isCheckingAuth || !publicKey) {
    return (
      <div className="h-screen overflow-hidden bg-white flex items-center justify-center">
        <span className="text-gray-600 text-sm">{isCheckingAuth ? 'Checking session…' : 'Redirecting to login...'}</span>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
}
