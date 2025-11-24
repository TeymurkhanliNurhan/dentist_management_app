import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Lock, AlertCircle } from 'lucide-react';
import { subscriptionService } from '../services/api';
import type { PaymentMethod } from '../services/api';
import Header from './Header';

declare global {
  interface Window {
    Stripe: any;
  }
}

const PaymentRequired = () => {
  const { t } = useTranslation('subscription');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const [stripeElements, setStripeElements] = useState<any>(null);
  const [stripeCardElement, setStripeCardElement] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string>('');
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await subscriptionService.getStatus();
        setSubscriptionStatus(status);
        setIsExtending(status.active);
      } catch (err) {
        console.error('Failed to check subscription status:', err);
      }
    };
    checkStatus();

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      handleCapturePayment(token);
    }

    if (selectedPaymentMethod === 'stripe' && !window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {};
      document.head.appendChild(script);
    }
  }, [selectedPaymentMethod]);

  const initializeStripe = async (publishableKey: string) => {
    if (!window.Stripe) {
      throw new Error('Stripe.js not loaded');
    }

    const stripeInstance = window.Stripe(publishableKey);
    setStripe(stripeInstance);

    const elements = stripeInstance.elements();
    setStripeElements(elements);

    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
    });

    setStripeCardElement(cardElement);
  };

  useEffect(() => {
    if (stripeCardElement && stripeClientSecret) {
      const mountElement = () => {
        const element = document.getElementById('stripe-card-element');
        if (element && !element.hasChildNodes()) {
          try {
            stripeCardElement.mount('#stripe-card-element');
          } catch (error) {
            console.error('Error mounting Stripe element:', error);
          }
        } else if (!element) {
          setTimeout(mountElement, 50);
        }
      };
      
      const timer = setTimeout(mountElement, 100);
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (stripeCardElement) {
        try {
          stripeCardElement.unmount();
        } catch (error) {
        }
      }
    };
  }, [stripeCardElement, stripeClientSecret]);

  const handleCreatePayment = async () => {
    setIsProcessing(true);
    setError('');
    setSuccess(false);

    try {
      const result = await subscriptionService.createOrder(selectedPaymentMethod);

      if (selectedPaymentMethod === 'paypal') {
        if (result.approvalUrl) {
          window.location.href = result.approvalUrl;
        } else {
          throw new Error('PayPal approval URL not received');
        }
      } else if (selectedPaymentMethod === 'stripe') {
        if (result.publishableKey && result.clientSecret && result.paymentIntentId) {
          setStripeClientSecret(result.clientSecret);
          setStripePaymentIntentId(result.paymentIntentId);
          setIsProcessing(false);
          setTimeout(async () => {
            try {
              await initializeStripe(result.publishableKey!);
            } catch (err: any) {
              console.error('Stripe initialization error:', err);
              setError(err.message || 'Failed to initialize Stripe');
            }
          }, 150);
        } else {
          throw new Error('Stripe payment details not received');
        }
      }
    } catch (err: any) {
      console.error('Payment creation error:', err);
      const errorMessage = err.response?.data?.message || err.message || t('paymentError');
      
      if (errorMessage.includes('restricted') || errorMessage.includes('PayPal account')) {
        setError(`${errorMessage} Please try using Stripe instead, or check your PayPal account status.`);
      } else {
        setError(errorMessage);
      }
      setIsProcessing(false);
    }
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !stripeElements || !stripeClientSecret) {
      setError('Stripe not initialized');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        stripeClientSecret,
        {
          payment_method: {
            card: stripeCardElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await subscriptionService.captureStripePayment(stripePaymentIntentId);
        setSuccess(true);
        const status = await subscriptionService.getStatus();
        setSubscriptionStatus(status);
        setTimeout(() => {
          if (isExtending) {
            window.location.href = '/settings';
          } else {
            window.location.href = '/dashboard';
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('Stripe payment error:', err);
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
      const status = await subscriptionService.getStatus();
      setSubscriptionStatus(status);
      setTimeout(() => {
        if (isExtending) {
          window.location.href = '/settings';
        } else {
          window.location.href = '/dashboard';
        }
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
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <Lock className="w-16 h-16 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {isExtending ? 'Extend Subscription' : t('paymentRequired')}
          </h1>

          <div className="flex items-center justify-center gap-3 mb-8">
            <AlertCircle className={`w-6 h-6 ${isExtending ? 'text-blue-500' : 'text-orange-500'}`} />
            <p className="text-xl text-gray-700">
              {isExtending 
                ? 'Pay $1.00 USD to extend your subscription by one more month'
                : t('paymentMessage')
              }
            </p>
          </div>

          {isExtending && subscriptionStatus && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Current Status:</strong> Active
              </p>
              {subscriptionStatus.daysUntilExpiry !== null && (
                <p className="text-sm text-gray-700">
                  <strong>Days until expiry:</strong> {subscriptionStatus.daysUntilExpiry} days
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                After payment, your subscription will be extended by 30 days from your current expiry date.
              </p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {t('paymentSuccess')}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Payment Error</p>
                  <p className="text-sm">{error}</p>
                  {error.includes('PayPal') && error.includes('restricted') && (
                    <button
                      onClick={() => {
                        setError('');
                        setSelectedPaymentMethod('stripe');
                      }}
                      className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Switch to Stripe Instead
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!stripeClientSecret && (
            <div className="mb-8">
              <p className="text-lg font-semibold text-gray-800 mb-4">Choose Payment Method</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setSelectedPaymentMethod('paypal')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedPaymentMethod === 'paypal'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  PayPal
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('stripe')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedPaymentMethod === 'stripe'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Stripe
                </button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <p className="text-lg font-semibold text-gray-800">
                {t('monthlyFee')}
              </p>
            </div>
            {selectedPaymentMethod === 'paypal' && !stripeClientSecret && (
              <p className="text-sm text-gray-600">
                {t('redirectingPayPal')}
              </p>
            )}
            {selectedPaymentMethod === 'stripe' && !stripeClientSecret && (
              <p className="text-sm text-gray-600">
                Enter your card details to proceed
              </p>
            )}
          </div>

          {selectedPaymentMethod === 'stripe' && stripeClientSecret && (
            <form onSubmit={handleStripeSubmit} className="mb-8 text-left max-w-md mx-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Details
                </label>
                <div
                  id="stripe-card-element"
                  className="p-4 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || success}
                className={`
                  w-full px-8 py-4 
                  bg-purple-600 hover:bg-purple-700 
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
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay with Stripe
                  </>
                )}
              </button>
            </form>
          )}

          {!stripeClientSecret && (
            <button
              onClick={handleCreatePayment}
              disabled={isProcessing || success}
              className={`
                w-full md:w-auto px-8 py-4 
                ${selectedPaymentMethod === 'paypal' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-purple-600 hover:bg-purple-700'}
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
                  {selectedPaymentMethod === 'paypal' ? t('createPayment') : 'Continue with Stripe'}
                </>
              )}
            </button>
          )}

          <p className="mt-8 text-sm text-gray-500">
            Secure payment processed by {selectedPaymentMethod === 'paypal' ? 'PayPal' : 'Stripe'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default PaymentRequired;
