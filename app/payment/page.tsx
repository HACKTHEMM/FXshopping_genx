'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import RouteSearch from '../components/RouteSearch';
import PaymentExecution from '../components/PaymentExecution';
import { PaymentRoute } from '../../lib/stellar';

export default function PaymentPage() {
  const [selectedRoute, setSelectedRoute] = useState<PaymentRoute | null>(null);
  const [showPaymentExecution, setShowPaymentExecution] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const handleRouteSelect = (route: PaymentRoute) => {
    setSelectedRoute(route);
    setShowPaymentExecution(false);
    setPaymentResult(null);
  };

  const handleExecutePayment = (route: PaymentRoute) => {
    setSelectedRoute(route);
    setShowPaymentExecution(true);
    setPaymentResult(null);
  };

  const handlePaymentComplete = (result: any) => {
    setPaymentResult(result);
  };

  const handleNewPayment = () => {
    setSelectedRoute(null);
    setShowPaymentExecution(false);
    setPaymentResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeTab="Payment" 
        onTabChange={() => {}} 
        onLogout={() => {}} 
      />
      
      <main className="py-8">
        {!showPaymentExecution ? (
          <RouteSearch
            onRouteSelect={handleRouteSelect}
            onExecutePayment={handleExecutePayment}
          />
        ) : selectedRoute ? (
          <PaymentExecution
            route={selectedRoute}
            onPaymentComplete={handlePaymentComplete}
            onCancel={handleNewPayment}
          />
        ) : null}
      </main>
    </div>
  );
}
