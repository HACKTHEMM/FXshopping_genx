'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Can I use a different crypto wallet to fund my account?",
      answer: "Yes! LumenFX supports all major Stellar-compatible wallets. Simply connect your wallet and you're ready to start making optimized cross-border payments."
    },
    {
      question: "Do I receive my funds in the exact currency I requested?",
      answer: "Absolutely. Our platform automatically finds the best conversion route to ensure you receive the exact currency you need at the optimal exchange rate, with full transparency on all fees."
    },
    {
      question: "Who's working on making more crypto wallets work — any hope?",
      answer: "We're constantly expanding wallet support. Our team is actively integrating with new providers and blockchain networks to give you more options for seamless payments."
    },
    {
      question: "What is Stellar and how does it work?",
      answer: "Stellar is a decentralized blockchain platform that enables fast, low-cost cross-border payments. LumenFX leverages Stellar's native path payment features to execute intelligent routing and provide advanced payment optimization."
    },
    {
      question: "Can I withdraw my funds at any time?",
      answer: "Yes, you have complete control over your funds. Withdraw anytime to your preferred wallet or bank account with transparent fees shown upfront."
    },
    {
      question: "How secure are my funds and personal information?",
      answer: "We use enterprise-grade encryption and never store your private keys. All transactions are secured by the Stellar blockchain's proven security infrastructure."
    },
    {
      question: "What types of currencies can I exchange through LumenFX?",
      answer: "LumenFX supports all major fiat currencies and Stellar-based assets, giving you flexibility in your cross-border payment options."
    },
    {
      question: "What happens if I need help with my account?",
      answer: "Our support team is available 24/7 via chat, email, or phone. We also provide comprehensive documentation and guides to help you get the most from the platform."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-black">
              LumenFX
            </Link>
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              <a href="#start" className="text-sm text-gray-700 hover:text-black transition-colors">Start</a>
              <a href="#how-it-works" className="text-sm text-gray-700 hover:text-black transition-colors">How It Works</a>
              <a href="#faq" className="text-sm text-gray-700 hover:text-black transition-colors">FAQ</a>
              <a href="#blog" className="text-sm text-gray-700 hover:text-black transition-colors">Blog</a>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/dashboard" className="hidden sm:block text-sm text-gray-700 hover:text-black transition-colors">
              Create Account
            </Link>
            <Link href="/dashboard" className="bg-black text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors">
              Log In
            </Link>
            <button 
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col space-y-3">
              <a href="#start" className="text-sm text-gray-700 hover:text-black" onClick={() => setMobileMenuOpen(false)}>Start</a>
              <a href="#how-it-works" className="text-sm text-gray-700 hover:text-black" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#faq" className="text-sm text-gray-700 hover:text-black" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <a href="#blog" className="text-sm text-gray-700 hover:text-black" onClick={() => setMobileMenuOpen(false)}>Blog</a>
              <Link href="/dashboard" className="text-sm text-gray-700 hover:text-black sm:hidden" onClick={() => setMobileMenuOpen(false)}>
                Create Account
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="start" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-black leading-tight">
                  Optimize your money.
                </h2>
                <h3 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  <span className="text-black">No </span>
                  <span className="text-blue-600">hidden fees</span>
                  <span className="text-black">, no guesswork.</span>
                </h3>
              </div>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl max-w-xl">
                With LumenFX, transferring is an art stress-free. Start in minutes—no paperwork required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/payment" className="bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base text-center">
                  Find Best Route
                </Link>
                <Link href="/dashboard" className="border-2 border-gray-900 text-black px-6 py-3 font-medium hover:bg-gray-900 hover:text-white transition-all text-sm sm:text-base text-center">
                  Dashboard
                </Link>
              </div>
            </div>

            {/* Right Dashboard Preview */}
            <div className="relative order-1 lg:order-2">
              <div className="bg-white border-2 border-gray-200 rounded-lg shadow-xl p-4 sm:p-6">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-black">LumenFX</h3>
                  <div className="hidden sm:flex items-center space-x-2 text-xs">
                    <span className="text-gray-600">Dashboard</span>
                    <span className="text-blue-600 font-medium">Transactions</span>
                    <span className="text-gray-600">Settings</span>
                  </div>
                </div>

                {/* Mock Account Info */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">WALLET USD</p>
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black">12,981</p>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 text-green-600 text-xs sm:text-sm font-medium">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                      <span>13.8%</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">Best rate found via Stellar</p>
                </div>

                {/* Mock Savings Info */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6">
                  <div className="mb-3 sm:mb-4">
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-1">SAVINGS USDC</p>
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black">149,576</p>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">Optimized routing savings</p>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -right-2 sm:-right-4 -top-2 sm:-top-4 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg">
                Live Rates
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Route Search Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4">
              <span className="text-blue-600">Find the best rate</span> in seconds
            </h2>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">
              Compare rates across Stellar network and traditional FX providers to get the most for your money.
            </p>
          </div>
          
          {/* Quick Search Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>INR</option>
                  <option>PHP</option>
                  <option>XLM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input 
                  type="number" 
                  placeholder="1000" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Link href="/payment" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center">
                  Search Routes
                </Link>
              </div>
            </div>
            
            {/* Demo Results */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Best route found:</span>
                <span className="text-sm font-medium text-green-600">Save $15.50 vs traditional providers</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Provider:</span>
                  <span className="ml-2 font-medium">Stellar Network</span>
                </div>
                <div>
                  <span className="text-gray-600">Recipient gets:</span>
                  <span className="ml-2 font-medium">₹83,250</span>
                </div>
                <div>
                  <span className="text-gray-600">Fees:</span>
                  <span className="ml-2 font-medium text-red-600">$0.0001</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-3 sm:mb-4">
              <span className="text-blue-600">Start transferring</span>
            </h2>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4 sm:mb-6">
              in just three simple steps
            </h3>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
              Just select Stellar-integrated wallets and accounts—we find the best rate, and execute like magic—plus, get a neat visual of your money zips around the world.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="bg-blue-50 p-6 sm:p-8 rounded-lg">
              <div className="inline-block bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                STEP 1 OF 3
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                Connect your wallet
              </h4>
              <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                Link your Stellar wallet or create a new one. We support all major Stellar-compatible wallets for seamless integration.
              </p>
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs sm:text-sm font-medium text-black">Wallet</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-200 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-black mb-1">12,981</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-3 sm:mb-4">USDC</p>
                <Link href="/dashboard" className="block w-full bg-black text-white py-2 text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors text-center">
                  Connect Wallet
                </Link>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-green-50 p-6 sm:p-8 rounded-lg">
              <div className="inline-block bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                STEP 2 OF 3
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                Choose best route
              </h4>
              <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                Our AI analyzes Stellar paths and off-chain providers in real-time to find the optimal conversion route with lowest fees.
              </p>
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs sm:text-sm font-medium text-black">Routing</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-200 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Stellar Path</span>
                    <span className="font-medium text-green-600">Best Rate</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Provider A</span>
                    <span className="text-gray-900">0.5% fee</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Provider B</span>
                    <span className="text-gray-900">0.8% fee</span>
                  </div>
                </div>
                <button className="w-full bg-black text-white py-2 text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors">
                  Select Route
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-purple-50 p-6 sm:p-8 rounded-lg md:col-span-2 lg:col-span-1">
              <div className="inline-block bg-purple-600 text-white px-3 py-1 rounded text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                STEP 3 OF 3
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                Track and receive
              </h4>
              <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                Watch your transfer in real-time with complete transparency. Full visibility into every fee and exchange rate applied.
              </p>
              <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <span className="text-xs sm:text-sm font-medium text-black">Transfer Status</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-200 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-gray-600">Sending</span>
                    <span className="text-gray-900">1,000 USD</span>
                  </div>
                  <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-gray-600">Fees</span>
                    <span className="text-gray-900">5.00 USD</span>
                  </div>
                  <div className="flex items-center justify-between font-medium text-xs sm:text-sm">
                    <span className="text-black">Recipient gets</span>
                    <span className="text-green-600">995 USD</span>
                  </div>
                </div>
                <div className="w-full bg-green-100 rounded-full h-2 mb-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-center text-green-600 font-medium">Transfer Complete</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Content */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-3 sm:mb-4">
                  Got questions?
                </h2>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4 sm:mb-6">
                  We've got answers.
                </h3>
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                  If you can't find what you're looking for, feel free to reach out to us directly through our 24/7 customer support.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Can't find your answer from our FAQ?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 transition-colors text-xs sm:text-sm text-center">
                    Get in touch
                  </Link>
                  <button className="border-2 border-gray-300 text-black px-6 py-3 font-medium hover:bg-gray-50 transition-colors text-xs sm:text-sm">
                    Extended FAQ Section
                  </button>
                </div>
              </div>
            </div>

            {/* Right FAQ List */}
            <div className="space-y-2 sm:space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-black pr-4 text-sm sm:text-base">{faq.question}</span>
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 transition-transform ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                      <p className="text-gray-600 text-xs sm:text-sm">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-4 sm:mb-6">
            <span className="text-blue-600">Transferring</span> that makes sense.
          </h2>
          <p className="text-gray-600 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Join thousands who trust LumenFX for transparent, optimized cross-border payments powered by Stellar blockchain.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link href="/dashboard" className="bg-blue-600 text-white px-6 sm:px-8 py-3 font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base text-center">
              Get Started
            </Link>
            <Link href="/dashboard" className="border-2 border-gray-900 text-black px-6 sm:px-8 py-3 font-medium hover:bg-gray-900 hover:text-white transition-all text-sm sm:text-base text-center">
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold text-black mb-3 sm:mb-4 text-sm sm:text-base">LumenFX</h3>
              <div className="space-y-2">
                <a href="#start" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Start</a>
                <a href="#how-it-works" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">How It Works</a>
                <a href="#faq" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">FAQ</a>
                <a href="#blog" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Blog</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3 sm:mb-4 text-xs sm:text-sm">Company</h4>
              <div className="space-y-2">
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">About</a>
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Careers</a>
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Press</a>
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3 sm:mb-4 text-xs sm:text-sm">Legal</h4>
              <div className="space-y-2">
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Privacy</a>
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Terms</a>
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Security</a>
                <a href="#" className="block text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Compliance</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3 sm:mb-4 text-xs sm:text-sm">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-600 hover:text-black transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-black transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.840 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.430.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-600">
            <p>Copyright © 2025 @ LumenFX. All rights reserved.</p>
            <p className="mt-2">Designed & Developed by <a href="#" className="text-blue-600 hover:underline">Stellar & Mateusz Madura</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
