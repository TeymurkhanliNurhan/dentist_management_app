import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    gmail: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'code' | 'password'>('email');
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await authService.login(formData);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('dentistId', data.dentistId.toString());
      
      
      setSuccess('Login successful! Redirecting...');
      
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please make sure the backend is running on http://localhost:3000. The API endpoints are at /Auth/SignIn (not /api/Auth/SignIn).');
      } else {
        setError(err.response?.data?.message || err.message || 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotPasswordLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.forgotPassword(forgotPasswordData.email);
      setSuccess('Reset code has been sent to your email.');
      setForgotPasswordStep('code');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send reset code');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotPasswordLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await authService.verifyResetCode(forgotPasswordData.email, forgotPasswordData.code);
      if (result.valid) {
        setSuccess('Code verified successfully!');
        setForgotPasswordStep('password');
      } else {
        setError('Invalid verification code');
      }
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to verify code');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotPasswordLoading(true);
    setError('');
    setSuccess('');

    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setError('Passwords do not match');
      setIsForgotPasswordLoading(false);
      return;
    }

    if (forgotPasswordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsForgotPasswordLoading(false);
      return;
    }

    try {
      const result = await authService.resetPassword(
        forgotPasswordData.email,
        forgotPasswordData.newPassword,
        forgotPasswordData.confirmPassword
      );
      if (result.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordStep('email');
          setForgotPasswordData({
            email: '',
            code: '',
            newPassword: '',
            confirmPassword: '',
          });
        }, 2000);
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8 relative"
      style={{
        backgroundImage: "url('/images/tooth_login.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/15 backdrop-blur-sm"></div>
      <div className="w-full max-w-md relative py-8 px-6 bg-white/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/40">
        
        
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-800 hover:text-gray-900 transition-colors relative"
          style={{ zIndex: 10 }}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
        </button>

        
        <div className="mb-8 relative" style={{ zIndex: 10 }}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Log In</h1>
          <p className="text-gray-700 text-sm">
            Log in to your account and start tracking your appointments.
          </p>
        </div>

        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm relative" style={{ zIndex: 10 }}>
            {success}
          </div>
        )}

        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm relative" style={{ zIndex: 10 }}>
            {error}
          </div>
        )}

        
        <form onSubmit={handleSubmit} className="space-y-5 relative" style={{ zIndex: 10 }}>
          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="gmail"
                name="gmail"
                value={formData.gmail}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder="Email"
              />
            </div>
          </div>

          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-teal-600 hover:text-teal-700 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        
        <div className="mt-6 text-center relative" style={{ zIndex: 10 }}>
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-teal-600 font-semibold hover:text-teal-700 hover:underline transition-colors"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md relative py-8 px-6 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/40">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordStep('email');
                setForgotPasswordData({
                  email: '',
                  code: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setError('');
                setSuccess('');
              }}
              className="mb-6 flex items-center text-gray-800 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
              <p className="text-gray-700 text-sm">
                {forgotPasswordStep === 'email' && 'Enter your email address to receive a reset code.'}
                {forgotPasswordStep === 'code' && 'Enter the verification code sent to your email.'}
                {forgotPasswordStep === 'password' && 'Enter your new password.'}
              </p>
            </div>

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {forgotPasswordStep === 'email' && (
              <form onSubmit={handleForgotPasswordEmail} className="space-y-5">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotPasswordData.email}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                      placeholder="Email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading}
                  className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotPasswordLoading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {forgotPasswordStep === 'code' && (
              <form onSubmit={handleVerifyResetCode} className="space-y-5">
                <div>
                  <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="resetCode"
                    required
                    value={forgotPasswordData.code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                      setForgotPasswordData({ ...forgotPasswordData, code: value });
                    }}
                    maxLength={7}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-center text-2xl tracking-widest font-mono"
                    placeholder="0000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading || forgotPasswordData.code.length !== 7}
                  className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotPasswordLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>
            )}

            {forgotPasswordStep === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotPasswordData.newPassword}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, newPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                      placeholder="New Password"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotPasswordData.confirmPassword}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                      placeholder="Confirm Password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading}
                  className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

