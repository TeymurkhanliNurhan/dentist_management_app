import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { subscriptionService } from '../services/api';
import Header from './Header';

const PaymentRequired = () => {
  const { t } = useTranslation('subscription');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we're returning from PayPal
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      handleCapturePayment(token);
    }
  }, []);

  const handleCreatePayment = async () => {
    setIsProcessing(true);
    setError('');
    setSuccess(false);

    try {
      const { approvalUrl } = await subscriptionService.createOrder();
      // Redirect to PayPal
      window.location.href = approvalUrl;
    } catch (err: any) {
      console.error('Payment creation error:', err);
      setError(err.response?.data?.message || err.message || t('paymentError'));
      setIsProcessing(false);
    }
  };

  const handleCapturePayment = async (orderId: string) => {
    setIsProcessing(true);
    setError('');

    try {
      await subscriptionService.capturePayment(orderId);
      setSuccess(true);
      // Reload page after 2 seconds to refresh subscription status
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      console.error('Payment capture error:', err);
      setError(err.response?.data?.message || err.message || t('paymentError'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center">
          {/* Lock Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <Lock className="w-16 h-16 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {t('paymentRequired')}
          </h1>

          {/* Message */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <p className="text-xl text-gray-700">
              {t('paymentMessage')}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {t('paymentSuccess')}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <p className="text-lg font-semibold text-gray-800">
                {t('monthlyFee')}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              {t('redirectingPayPal')}
            </p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleCreatePayment}
            disabled={isProcessing || success}
            className={`
              w-full md:w-auto px-8 py-4 
              bg-teal-600 hover:bg-teal-700 
              text-white font-bold text-lg rounded-lg
              transition-all duration-200
              disabled:bg-gray-400 disabled:cursor-not-allowed
              flex items-center justify-center gap-3
              shadow-lg hover:shadow-xl
            `}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('processingPayment')}
              </>
            ) : success ? (
              t('paymentSuccess')
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {t('createPayment')}
              </>
            )}
          </button>

          {/* Note */}
          <p className="mt-8 text-sm text-gray-500">
            Secure payment processed by PayPal
          </p>
        </div>
      </main>
    </div>
  );
};

export default PaymentRequired;

