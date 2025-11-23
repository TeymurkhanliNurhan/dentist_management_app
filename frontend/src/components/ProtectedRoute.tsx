import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { subscriptionService } from '../services/api';
import PaymentRequired from './PaymentRequired';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        console.log('ProtectedRoute: Checking subscription status...');
        const status = await subscriptionService.getStatus();
        console.log('ProtectedRoute: Subscription status received:', status);
        console.log('ProtectedRoute: Subscription active:', status.active);
        setSubscriptionActive(status.active);
      } catch (error: any) {
        console.error('ProtectedRoute: Failed to check subscription:', error);
        console.error('ProtectedRoute: Error details:', error.response?.data || error.message);
        // If error, assume inactive to be safe
        setSubscriptionActive(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  // Check if user is authenticated
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionActive) {
    return <PaymentRequired />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

