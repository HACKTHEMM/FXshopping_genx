'use client';

import { useState, useEffect } from 'react';
import { apiClient, PaymentRoute, ExecutePaymentResponse } from '../../lib/api-client';

interface PaymentExecutionProps {
  route: PaymentRoute;
  onPaymentComplete?: (result: ExecutePaymentResponse) => void;
  onCancel?: () => void;
}

export default function PaymentExecution({ route, onPaymentComplete, onCancel }: PaymentExecutionProps) {
  const [paymentData, setPaymentData] = useState({
    sourceAccount: '',
    targetAccount: '',
    memo: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecutePaymentResponse | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Auto-fill demo accounts for testing
  useEffect(() => {
    setPaymentData({
      sourceAccount: 'GCKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      targetAccount: 'GBKFBEIYTKPQY5HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      memo: 'Payment via StellarFX Shopper',
    });
  }, []);

  const handleExecutePayment = async () => {
    if (!paymentData.sourceAccount || !paymentData.targetAccount) {
      setError('Please enter both source and target account addresses');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.executePayment({
        routeId: route.id,
        sourceAccount: paymentData.sourceAccount,
        targetAccount: paymentData.targetAccount,
        memo: paymentData.memo,
        sourceCurrency: route.sourceCurrency,
        targetCurrency: route.targetCurrency,
        sourceAmount: route.sourceAmount,
        targetAmount: route.targetAmount,
        routeType: route.type,
      });

      setResult(response);
      onPaymentComplete?.(response);

      // Start monitoring transaction status
      if (response.transaction.hash || response.transaction.providerTransactionId) {
        setTimeout(() => {
          checkTransactionStatus(response);
        }, 2000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment execution failed');
      console.error('Payment execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTransactionStatus = async (paymentResult: ExecutePaymentResponse) => {
    setStatusLoading(true);
    try {
      const status = await apiClient.getTransactionStatus(
        paymentResult.transaction.providerTransactionId,
        paymentResult.transaction.hash || paymentResult.transaction.stellarTransactionHash
      );
      setTransactionStatus(status);
    } catch (error) {
      console.error('Failed to check transaction status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'processing':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'processing':
      case 'pending':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Payment Result */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
              getStatusColor(result.transaction.status)
            }`}>
              {getStatusIcon(result.transaction.status)}
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">
              Payment {result.transaction.status === 'success' ? 'Successful!' : 'Processing'}
            </h2>
            <p className="text-gray-600">
              {result.transaction.status === 'success' 
                ? 'Your payment has been processed successfully'
                : 'Your payment is being processed'
              }
            </p>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Hash
                </label>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {result.transaction.hash || result.transaction.stellarTransactionHash || 'Pending...'}
                  </code>
                  {result.transaction.hash && (
                    <a
                      href={result.tracking?.stellarExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Sent
                </label>
                <p className="text-lg font-semibold">
                  {result.transaction.sourceAmount} {result.transaction.sourceCurrency}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Gets
                </label>
                <p className="text-lg font-semibold text-green-600">
                  {result.transaction.targetAmount} {result.transaction.targetCurrency}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Fees
                </label>
                <p className="text-lg font-semibold text-red-600">
                  {result.transaction.fees.totalFees} {result.transaction.sourceCurrency}
                </p>
              </div>
            </div>

            {/* Execution Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Execution Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Method:</span>
                  <span className="ml-2 font-medium">{result.execution.method}</span>
                </div>
                <div>
                  <span className="text-gray-600">Estimated Time:</span>
                  <span className="ml-2 font-medium">{result.execution.estimatedTime}</span>
                </div>
                <div>
                  <span className="text-gray-600">Actual Time:</span>
                  <span className="ml-2 font-medium">{result.execution.actualTime}</span>
                </div>
                {result.execution.confirmationBlocks && (
                  <div>
                    <span className="text-gray-600">Confirmations:</span>
                    <span className="ml-2 font-medium">{result.execution.confirmationBlocks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Links */}
            {result.tracking && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Tracking</h4>
                {result.tracking.stellarExplorerUrl && (
                  <a
                    href={result.tracking.stellarExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View on Stellar Explorer →
                  </a>
                )}
                {result.tracking.providerTrackingUrl && (
                  <a
                    href={result.tracking.providerTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Track with Provider →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => checkTransactionStatus(result)}
              disabled={statusLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {statusLoading ? 'Checking...' : 'Refresh Status'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              New Payment
            </button>
          </div>
        </div>

        {/* Transaction Status */}
        {transactionStatus && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Transaction Status</h3>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                getStatusColor(transactionStatus.transaction.status)
              }`}>
                {transactionStatus.transaction.status.toUpperCase()}
              </div>
              {transactionStatus.transaction.confirmations > 0 && (
                <span className="text-sm text-gray-600">
                  {transactionStatus.transaction.confirmations} confirmations
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Last updated: {new Date(transactionStatus.transaction.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Route Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-black mb-4">Execute Payment</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Selected Route</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Provider:</span>
              <span className="ml-2 font-medium">{route.provider.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Method:</span>
              <span className="ml-2 font-medium">{route.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-gray-600">Estimated Time:</span>
              <span className="ml-2 font-medium">{route.estimatedTime}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Account (Your Stellar Address)
            </label>
            <input
              type="text"
              value={paymentData.sourceAccount}
              onChange={(e) => setPaymentData(prev => ({ ...prev, sourceAccount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="GCKFBEIYTKPQY5H..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Account (Recipient Address)
            </label>
            <input
              type="text"
              value={paymentData.targetAccount}
              onChange={(e) => setPaymentData(prev => ({ ...prev, targetAccount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="GBKFBEIYTKPQY5H..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              value={paymentData.memo}
              onChange={(e) => setPaymentData(prev => ({ ...prev, memo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payment description"
            />
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">You send:</span>
              <span className="font-medium">{route.sourceAmount} {route.sourceCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fees:</span>
              <span className="font-medium text-red-600">{route.fees.totalFees} {route.sourceCurrency}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Recipient gets:</span>
              <span className="font-medium text-green-600">{route.netRecipientAmount} {route.targetCurrency}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={handleExecutePayment}
            disabled={loading}
            className="flex-1 bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Executing Payment...' : 'Execute Payment'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
