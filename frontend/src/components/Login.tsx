import { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languages = [
    { code: 'az', label: 'Azərbaycan', flag: '/images/azerbaijani_flag_logo.png' },
    { code: 'en', label: 'English', flag: '/images/english_flag_logo.png' },
    { code: 'ru', label: 'Русский', flag: '/images/russian_flag_logo.png' },
  ];
  const currentLanguage =
    languages.find((language) => language.code === i18n.language) || languages[0];

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);
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
      
      
      setSuccess(t('loginSuccessful'));
      
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError(t('networkError'));
      } else {
        setError(err.response?.data?.message || err.message || t('invalidCredentials'));
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
      setSuccess(t('codeSent'));
      setForgotPasswordStep('code');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || err.message || t('failedToSend'));
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
        setSuccess(t('codeVerified'));
        setForgotPasswordStep('password');
      } else {
        setError(t('invalidCode'));
      }
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.response?.data?.message || err.message || t('failedToVerify'));
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
      setError(t('passwordsNotMatch'));
      setIsForgotPasswordLoading(false);
      return;
    }

    if (forgotPasswordData.newPassword.length < 6) {
      setError(t('passwordTooShort'));
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
        setSuccess(t('passwordReset'));
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
        setError(result.message || t('failedToReset'));
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || err.message || t('failedToReset'));
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
        
        {/* Language Switcher */}
        <div className="absolute top-4 right-4 relative" style={{ zIndex: 20 }} ref={languageMenuRef}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm"
            aria-label="Change language"
          >
            <img src={currentLanguage.flag} alt={currentLanguage.label} className="w-6 h-6 rounded-full object-cover" />
          </button>
          {showLanguageMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[120px]">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    i18n.changeLanguage(language.code);
                    setShowLanguageMenu(false);
                  }}
                  className={`w-full px-4 py-2 flex items-center justify-center hover:bg-gray-100 transition-colors ${
                    i18n.language === language.code ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                  }`}
                  aria-label={language.label}
                >
                  <img src={language.flag} alt={language.label} className="w-6 h-6 rounded-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-800 hover:text-gray-900 transition-colors relative"
          style={{ zIndex: 10 }}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
        </button>

        
        <div className="mb-8 relative" style={{ zIndex: 10 }}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-700 text-sm">
            {t('subtitle')}
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
                placeholder={t('email')}
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
                placeholder={t('password')}
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
              {t('forgotPassword')}
            </button>
          </div>

          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('loggingIn') : t('loginButton')}
          </button>
        </form>

        
        <div className="mt-6 text-center relative" style={{ zIndex: 10 }}>
          <p className="text-gray-600 text-sm">
            {t('noAccount')}{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-teal-600 font-semibold hover:text-teal-700 hover:underline transition-colors"
            >
              {t('signUp')}
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('resetPassword')}</h1>
              <p className="text-gray-700 text-sm">
                {forgotPasswordStep === 'email' && t('enterEmail')}
                {forgotPasswordStep === 'code' && t('enterCode')}
                {forgotPasswordStep === 'password' && t('enterNewPassword')}
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
                      placeholder={t('email')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading}
                  className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotPasswordLoading ? t('sending') : t('sendCode')}
                </button>
              </form>
            )}

            {forgotPasswordStep === 'code' && (
              <form onSubmit={handleVerifyResetCode} className="space-y-5">
                <div>
                  <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('verifyCode')}
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
                  {isForgotPasswordLoading ? t('verifying') : t('verifyCode')}
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
                      placeholder={t('newPassword')}
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
                      placeholder={t('confirmPassword')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotPasswordLoading}
                  className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotPasswordLoading ? t('resetting') : t('resetPasswordButton')}
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

