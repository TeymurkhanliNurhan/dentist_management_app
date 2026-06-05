import { useState, useEffect, useRef } from 'react';
import { User, Lock, Eye, EyeOff, ChevronLeft, Calendar, Building2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { patientAuthService, persistPatientSession } from '../services/api';

const PatientLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('patientAuth');
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

  const defaultClinicId = searchParams.get('clinicId') ?? '';

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    birthDate: '',
    password: '',
    clinicId: defaultClinicId,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    const clinicId = parseInt(formData.clinicId, 10);
    if (!Number.isFinite(clinicId) || clinicId < 1) {
      setError(t('invalidCredentials'));
      setIsLoading(false);
      return;
    }

    try {
      const data = await patientAuthService.signin({
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        birthDate: formData.birthDate,
        password: formData.password,
        clinicId,
      });
      persistPatientSession(data);
      setSuccess(t('signInSuccessful'));
      setTimeout(() => {
        navigate(`/patients/${data.patientId}`);
      }, 1200);
    } catch (err: any) {
      console.error('Patient signin error:', err);
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

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('/images/tooth_login.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />

      <div className="w-full max-w-md relative py-8 px-6 bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/40">
        <div className="absolute top-4 right-4 z-20" ref={languageMenuRef}>
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="p-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm"
              aria-label="Change language"
              aria-expanded={showLanguageMenu}
            >
              <img src={currentLanguage.flag} alt={currentLanguage.label} className="w-6 h-6 rounded-full object-cover" />
            </button>
            {showLanguageMenu && (
              <div className="absolute right-0 top-full z-50 mt-1.5 flex flex-col rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden min-w-[120px]">
                {languages.map((language) => (
                  <button
                    type="button"
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
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center text-gray-800 hover:text-gray-900 transition-colors relative"
          style={{ zIndex: 10 }}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          <span className="text-sm">{t('staffPortal')}</span>
        </button>

        <div className="mb-8 relative" style={{ zIndex: 10 }}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('signInTitle')}</h1>
          <p className="text-gray-700 text-sm">{t('signInSubtitle')}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 relative" style={{ zIndex: 10 }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder={t('name')}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder={t('surname')}
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              name="clinicId"
              value={formData.clinicId}
              onChange={handleChange}
              required
              min={1}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              placeholder={t('clinicId')}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
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
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('signingIn') : t('signInButton')}
          </button>
        </form>

        <div className="mt-6 text-center relative" style={{ zIndex: 10 }}>
          <p className="text-gray-600 text-sm">
            {t('noAccount')}{' '}
            <button
              onClick={() => navigate(`/patient/signup${formData.clinicId ? `?clinicId=${formData.clinicId}` : ''}`)}
              className="text-teal-600 font-semibold hover:text-teal-700 hover:underline transition-colors"
            >
              {t('signUp')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
