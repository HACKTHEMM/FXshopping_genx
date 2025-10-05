'use client';

import { useState } from 'react';
import { RouteQuote } from '@/lib/types/route';
import PaymentForm from './PaymentForm';
import RouteComparison from './RouteComparison';

interface RoutesProps {
  publicKey?: string;
}

export default function Routes({ publicKey }: RoutesProps) {
  const [routes, setRoutes] = useState<RouteQuote[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteQuote | null>(null);

  const handleRoutesFound = (foundRoutes: RouteQuote[]) => {
    setRoutes(foundRoutes);
    setSelectedRoute(null); // Reset selection
    
    // Smooth scroll to results on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const resultsSection = document.getElementById('route-results');
        resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleSelectRoute = (route: RouteQuote) => {
    setSelectedRoute(route);
    // TODO: Integrate with Freighter wallet for transaction signing
    alert(`Route selected: ${route.providerName}\nNet Receive: ${route.netReceive} ${route.destinationFiat || route.destAsset.code}\n\nTransaction signing will be implemented in next step.`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-gray-200 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-1 md:mb-2">FX Route Shopping</h1>
        <p className="text-sm md:text-base text-gray-600">
          Compare cross-border payment routes and find the best rates across multiple providers
        </p>
      </div>

      {/* Responsive Layout: Stack on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column: Payment Form */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <PaymentForm 
              onRoutesFound={handleRoutesFound}
              publicKey={publicKey}
            />
          </div>
        </div>

        {/* Right Column: Route Comparison */}
        <div id="route-results" className="lg:col-span-2">
          <RouteComparison 
            routes={routes}
            onSelectRoute={handleSelectRoute}
          />
        </div>
      </div>

      {/* Selected Route Summary (if any) - Mobile Optimized */}
      {selectedRoute && (
        <div className="bg-blue-50 border-2 border-blue-500 p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-black mb-3 md:mb-4">
            ✓ Route Selected: {selectedRoute.providerName}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-600 mb-1">Send Amount</div>
              <div className="font-bold text-black text-sm md:text-base">
                {selectedRoute.grossSend.toLocaleString()} {selectedRoute.sourceFiat || selectedRoute.sendAsset.code}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Receive Amount</div>
              <div className="font-bold text-green-600 text-sm md:text-base">
                {selectedRoute.netReceive.toLocaleString()} {selectedRoute.destinationFiat || selectedRoute.destAsset.code}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Fees</div>
              <div className="font-bold text-black text-sm md:text-base">
                {selectedRoute.totalFees.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Est. Time</div>
              <div className="font-bold text-black text-sm md:text-base">
                ~{selectedRoute.execution.estimatedConfirmationTime}s
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <button
              className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
              onClick={() => alert('Freighter wallet integration coming next!')}
            >
              Sign Transaction with Freighter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
