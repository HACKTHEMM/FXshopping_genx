'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Transactions from '../components/Transactions';
import Settings from '../components/Settings';
import Routes from '../components/Routes';

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
    const currentXLM = accountData.balances.find((b: { asset_type?: string }) => b.asset_type === 'native')?.balance || '0';
    
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
  const [usdtestBalance, setUsdtestBalance] = useState<string>('0');
  const [inrtestBalance, setInrtestBalance] = useState<string>('0');
  const [balanceHistory, setBalanceHistory] = useState<Array<{ month: string; amount: number }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    to?: string;
    from?: string;
    amount?: string;
    created_at?: string;
  }>>([]);
  const [xlmPrice, setXlmPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [usdToInrRate, setUsdToInrRate] = useState<number>(88.7);
  const [inrPriceChange, setInrPriceChange] = useState<number>(0);
  const [showReceivePopup, setShowReceivePopup] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const horizonUrl = 'https://horizon-testnet.stellar.org';

  const maxAmount = balanceHistory.length > 0
    ? Math.max(...balanceHistory.map(d => d.amount))
    : 100;

  // Calculate total portfolio value in USD (treating USDTEST as USD equivalent)
  const totalPortfolioValue = (parseFloat(xlmBalance) * xlmPrice) + parseFloat(usdtestBalance) + (parseFloat(inrtestBalance) / usdToInrRate);

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
        const usdtest = balances.find(b => b.asset_code === 'USDTEST');
        const inrtest = balances.find(b => b.asset_code === 'INRTEST');
        setXlmBalance(native?.balance || '0');
        setUsdtestBalance(usdtest?.balance || '0');
        setInrtestBalance(inrtest?.balance || '0');

        // Fetch balance history
        setIsLoadingHistory(true);
        const history = await calculateBalanceHistory(publicKey);
        setBalanceHistory(history);
        setIsLoadingHistory(false);

        // Fetch recent transactions
        const txRes = await fetch(`${horizonUrl}/accounts/${publicKey}/payments?order=desc&limit=5`);
        const txData = await txRes.json();
        setRecentTransactions(txData.records || []);
      } catch {
        setXlmBalance('0');
        setUsdtestBalance('0');
        setInrtestBalance('0');
        setIsLoadingHistory(false);
      }
    };
    fetchBalances();
  }, [publicKey]);

  // Fetch XLM price and USD to INR rate
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch XLM price
        const xlmRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true');
        const xlmData = await xlmRes.json();
        setXlmPrice(xlmData.stellar?.usd || 0);
        setPriceChange(xlmData.stellar?.usd_24h_change || 0);

        // Fetch USD to INR rate from exchangerate-api (free tier)
        const inrRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const inrData = await inrRes.json();
        if (inrData.rates && inrData.rates.INR) {
          setUsdToInrRate(inrData.rates.INR);
          // Calculate approximate 24h change (can be enhanced with historical data)
          setInrPriceChange(0.12); // Placeholder, as free API doesn't provide change
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
        setXlmPrice(0);
        setPriceChange(0);
        setUsdToInrRate(88.7); // Fallback rate
      }
    };
    fetchPrices();

    // Refresh rates every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Copy wallet address function
  const handleCopyAddress = async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleLogin = (key: string) => {
    localStorage.setItem('stellarAddress', key);
    setPublicKey(key);
  };

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
      case 'Transactions':
        return <Transactions address={publicKey || undefined} />;
      case 'Settings':
        return <Settings onTabChange={setActiveTab} />;
      case 'Dashboard':
      default:
        return (
          <main className="h-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-4 overflow-auto">
            <div className="max-w-[1400px] mx-auto">
              {/* Mobile Layout */}
              <div className="flex flex-col md:hidden space-y-4 pb-8">
                {/* Portfolio Summary */}
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-gray-500">Portfolio Balance</h2>
                  <div className="text-4xl font-bold text-black">
                    ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                    <span className="text-sm text-gray-500">Last 24 hours</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setActiveTab('Routes')}
                    className="flex flex-col items-center p-3 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">Exchange</span>
                  </button>
                  <button
                    onClick={() => router.push('/cross-chain')}
                    className="flex flex-col items-center p-3 bg-green-50 hover:bg-green-100 transition-colors rounded-lg"
                  >
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">Cross-Chain</span>
                  </button>
                  <button
                    onClick={() => setShowReceivePopup(true)}
                    className="flex flex-col items-center p-3 bg-purple-50 hover:bg-purple-100 transition-colors rounded-lg"
                  >
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h5m0 0V2m0 5l7 7-7 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-900">Receive</span>
                  </button>
                </div>

                {/* Assets List */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Your Assets</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {/* XLM Asset */}
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">XLM</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Stellar Lumens</div>
                          <div className="text-sm text-gray-500">{parseFloat(xlmBalance).toFixed(4)} XLM</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ${(parseFloat(xlmBalance) * xlmPrice).toFixed(2)}
                        </div>
                        <div className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    {/* USDTEST Asset */}
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold text-sm">USD</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">USDTEST</div>
                          <div className="text-sm text-gray-500">{Number(usdtestBalance).toLocaleString()} USD</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ${Number(usdtestBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-500">Test Asset</div>
                      </div>
                    </div>
                    {/* INRTEST Asset */}
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-sm">INR</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">INRTEST</div>
                          <div className="text-sm text-gray-500">{Number(inrtestBalance).toLocaleString()} INR</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ${(parseFloat(inrtestBalance) / usdToInrRate).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">Test Asset</div>
                      </div>
                    </div>
                  </div>
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
                      <div className="text-xs text-gray-600 mb-1">USDTEST Balance</div>
                      <div className="text-xl font-bold text-gray-900">{Number(usdtestBalance).toLocaleString()}</div>
                      <div className="text-xs text-gray-600">USDTEST</div>
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

                {/* Exchange Rates Card - Mobile */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900">Exchange Rates</h3>
                    <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-3 mb-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900">USD/INR</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">₹{usdToInrRate.toFixed(2)}</div>
                        <div className={`text-xs ${inrPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {inrPriceChange >= 0 ? '+' : ''}{inrPriceChange.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-gray-900">XLM/USD</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">${xlmPrice.toFixed(4)}</div>
                        <div className={`text-xs ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('Routes')}
                    className="w-full bg-black text-white py-2 text-sm font-medium hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span>Exchange Currency</span>
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((tx, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.to === publicKey ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                              <svg className={`w-5 h-5 ${tx.to === publicKey ? 'text-green-600' : 'text-blue-600'}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d={tx.to === publicKey ? "M7 16l-4-4m0 0l4-4m-4 4h18" : "M17 8l4 4m0 0l-4 4m4-4H3"} />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {tx.to === publicKey ? 'Received' : 'Sent'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(tx.created_at || Date.now()).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${tx.to === publicKey ? 'text-green-600' : 'text-gray-900'}`}>
                              {tx.to === publicKey ? '+' : '-'}{parseFloat(tx.amount || '0').toFixed(2)} XLM
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No recent transactions
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout: 1024px+ */}
              <div className="hidden md:block pb-8">
                {/* Portfolio Header */}
                <div className="mb-6">
                  <h2 className="text-sm font-medium text-gray-500 mb-2">Portfolio Balance</h2>
                  <div className="flex items-end space-x-4 mb-2">
                    <div className="text-5xl font-bold text-black">
                      ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-lg font-semibold pb-2 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                  </div>
                  <p className="text-gray-500">Last 24 hours</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <button
                    onClick={() => setActiveTab('Routes')}
                    className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 transition-colors rounded-xl"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Exchange</span>
                  </button>
                  <button
                    onClick={() => router.push('/cross-chain')}
                    className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 transition-colors rounded-xl"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Cross-Chain</span>
                  </button>
                  <button
                    onClick={() => setShowReceivePopup(true)}
                    className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 transition-colors rounded-xl"
                  >
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h5m0 0V2m0 5l7 7-7 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Receive</span>
                  </button>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Column - Assets & Chart */}
                  <div className="col-span-8 space-y-6">
                    {/* Assets List */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                      <div className="p-5 border-b border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900">Your Assets</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {/* XLM Asset */}
                        <div className="p-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold">XLM</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">Stellar Lumens</div>
                              <div className="text-sm text-gray-500">{parseFloat(xlmBalance).toFixed(4)} XLM</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 text-lg">
                              ${(parseFloat(xlmBalance) * xlmPrice).toFixed(2)}
                            </div>
                            <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        {/* USDTEST Asset */}
                        <div className="p-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 font-bold">USD</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">USDTEST</div>
                              <div className="text-sm text-gray-500">{Number(usdtestBalance).toLocaleString()} USD</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 text-lg">
                              ${Number(usdtestBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-gray-500">Test Asset</div>
                          </div>
                        </div>
                        {/* INRTEST Asset */}
                        <div className="p-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="text-orange-600 font-bold">INR</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">INRTEST</div>
                              <div className="text-sm text-gray-500">{Number(inrtestBalance).toLocaleString()} INR</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 text-lg">
                              ${(parseFloat(inrtestBalance) / usdToInrRate).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">Test Asset</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance History Chart */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="mb-5">
                        <h3 className="text-xl font-bold text-gray-900">Balance History</h3>
                        <p className="text-gray-500 text-sm">Your XLM balance over the last 12 months</p>
                      </div>
                      {isLoadingHistory ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                          Loading history...
                        </div>
                      ) : balanceHistory.length > 0 ? (
                        <div className="h-64 flex items-end justify-between gap-2">
                          {balanceHistory.map((item, idx) => (
                            <div key={item.month} className="flex flex-col items-center flex-1 group">
                              <div className="text-xs font-semibold text-gray-600 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.amount}
                              </div>
                              <div
                                className="bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 w-full rounded-t-lg transition-all hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 cursor-pointer"
                                style={{
                                  height: `${Math.max((item.amount / maxAmount) * 240, 20)}px`,
                                  minHeight: '20px'
                                }}
                              ></div>
                              <div className="text-xs text-gray-500 mt-2 font-medium">{item.month}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                          No balance history available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Exchange Rates & Activity */}
                  <div className="col-span-4 space-y-6">
                    {/* Exchange Rates Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Exchange Rates</h3>
                        <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-4 mb-5">
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">USD to INR</div>
                            <div className="text-2xl font-bold text-gray-900">₹{usdToInrRate.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-semibold ${inrPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {inrPriceChange >= 0 ? '+' : ''}{inrPriceChange.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-500">24h</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">XLM to USD</div>
                            <div className="text-2xl font-bold text-gray-900">${xlmPrice.toFixed(4)}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-500">24h</div>
                          </div>
                        </div>
                        <div className="border-t border-purple-200 pt-4">
                          <p className="text-sm text-gray-600">
                            Real-time forex rates for currency exchange. Rates update every minute.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('Routes')}
                        className="w-full bg-black text-white py-3 text-sm font-semibold hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center space-x-2 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span>Exchange Currency</span>
                      </button>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                        <button className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {recentTransactions.length > 0 ? (
                          recentTransactions.map((tx, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  tx.to === publicKey ? 'bg-green-100' : 'bg-blue-100'
                                }`}>
                                  <svg className={`w-5 h-5 ${tx.to === publicKey ? 'text-green-600' : 'text-blue-600'}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d={tx.to === publicKey ? "M7 16l-4-4m0 0l4-4m-4 4h18" : "M17 8l4 4m0 0l-4 4m4-4H3"} />
                                  </svg>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {tx.to === publicKey ? 'Received' : 'Sent'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(tx.created_at || Date.now()).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${tx.to === publicKey ? 'text-green-600' : 'text-gray-900'}`}>
                                  {tx.to === publicKey ? '+' : '-'}{parseFloat(tx.amount || '0').toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">XLM</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-500">
                            No recent transactions
                          </div>
                        )}
                      </div>
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

      {/* Receive Popup Modal */}
      {showReceivePopup && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Receive Funds</h3>
              <button
                onClick={() => setShowReceivePopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Share your wallet address to receive payments in XLM, USDTEST, or INRTEST.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Your Wallet Address</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={publicKey || ''}
                  readOnly
                  className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleCopyAddress}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {copySuccess ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Address</span>
                </>
              )}
            </button>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Make sure the sender is using the Stellar network when sending funds to this address.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
