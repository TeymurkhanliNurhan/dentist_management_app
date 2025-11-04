import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react';
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8 relative"
      style={{
        backgroundImage: "url('/images/tooth_login.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md"></div>
      <div className="w-full max-w-md relative py-8 px-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white/50">
        
        
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
            <a
              href="#"
              className="text-sm text-teal-600 hover:text-teal-700 transition-colors"
            >
              Forgot password?
            </a>
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
    </div>
  );
};

export default Login;

