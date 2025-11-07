import { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ChevronLeft, User, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/api';

const SignUp = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    name: '',
    surname: '',
    birthDate: '',
    gmail: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsNotMatch'));
      setIsLoading(false);
      return;
    }

    
    if (formData.password.length < 6) {
      setError(t('passwordTooShort'));
      setIsLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await authService.register(registerData);
      
      setSuccess(t('registrationSuccessful'));
      setShowVerification(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError(t('networkError'));
      } else {
        setError(err.response?.data?.message || err.message || t('registrationFailed'));
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

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      await authService.verifyEmail(formData.gmail, verificationCode);
      setSuccess(t('emailVerified'));
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.response?.data?.message || err.message || t('verificationFailed'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      await authService.resendVerificationCode(formData.gmail);
      setSuccess(t('codeResent'));
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.response?.data?.message || err.message || t('failedToResend'));
    } finally {
      setIsResending(false);
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

        {showVerification ? (
          <div className="space-y-5 relative" style={{ zIndex: 10 }}>
            <div className="text-center mb-6">
              <Mail className="w-16 h-16 text-teal-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verifyEmail')}</h2>
              <p className="text-gray-700 text-sm">
                {t('codeSent')} <strong>{formData.gmail}</strong>
              </p>
              <p className="text-gray-600 text-xs mt-2">{t('checkInbox')}</p>
            </div>

            <form onSubmit={handleVerifyEmail} className="space-y-5">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('verificationCode')}
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? t('verifying') : t('verifyEmailButton')}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-teal-600 font-semibold hover:text-teal-700 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isResending ? t('sending') : t('resendCode')}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative" style={{ zIndex: 10 }}>
          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder={t('firstName')}
              />
            </div>
          </div>

          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder={t('lastName')}
              />
            </div>
          </div>

          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          
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
                minLength={6}
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

          
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder={t('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('signingUp') : t('signUpButton')}
          </button>
        </form>
        )}
        
        <div className="mt-6 text-center relative" style={{ zIndex: 10 }}>
          <p className="text-gray-600 text-sm">
            {t('haveAccount')}{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-teal-600 font-semibold hover:text-teal-700 hover:underline transition-colors"
            >
              {t('logIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

