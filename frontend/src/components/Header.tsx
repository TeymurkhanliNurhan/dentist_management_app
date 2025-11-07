import { useState, useEffect, useRef } from 'react';
import { Home, Settings, Mail, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dentistService } from '../services/api';

const Header = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('header');
  const [dentistSurname, setDentistSurname] = useState<string>('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const fetchDentistInfo = async () => {
      try {
        const dentistId = localStorage.getItem('dentistId');
        console.log('Dentist ID from localStorage:', dentistId);
        if (dentistId) {
          const dentist = await dentistService.getById(parseInt(dentistId));
          console.log('Fetched dentist info:', dentist);
          setDentistSurname(dentist.surname);
        } else {
          console.log('No dentistId found in localStorage');
        }
      } catch (error) {
        console.error('Failed to fetch dentist info:', error);
      }
    };

    fetchDentistInfo();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('dentistId');
    navigate('/login');
  };

  const languages = [
    { code: 'az', label: 'Azərbaycan', flag: '/images/azerbaijani_flag_logo.png' },
    { code: 'en', label: 'English', flag: '/images/english_flag_logo.png' },
    { code: 'ru', label: 'Русский', flag: '/images/russian_flag_logo.png' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <header className="bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-6">
            <h1 className="text-4xl font-bold text-white tracking-tight">{t('appTitle')}</h1>
            {dentistSurname && (
              <span className="text-2xl font-semibold text-white">
                Dr. {dentistSurname}
              </span>
            )}
          </div>

          <nav className="flex items-center space-x-6">
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-3 py-2.5 rounded-lg transition-all duration-200"
                aria-label="Change language"
              >
                <img src={currentLanguage.flag} alt={currentLanguage.label} className="w-6 h-6 rounded-full object-cover" />
              </button>
              {showLanguageMenu && (
                <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[120px] z-50">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        i18n.changeLanguage(language.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center justify-center hover:bg-gray-100 transition-colors ${
                        i18n.language === language.code ? 'bg-teal-50' : 'text-gray-700'
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
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all duration-200"
            >
              <Home className="w-6 h-6" />
              <span className="text-base font-medium">{t('mainMenu')}</span>
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all duration-200"
            >
              <Settings className="w-6 h-6" />
              <span className="text-base font-medium">{t('settings')}</span>
            </button>

            <button
              onClick={() => navigate('/contact')}
              className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all duration-200"
            >
              <Mail className="w-6 h-6" />
              <span className="text-base font-medium">{t('contact')}</span>
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-red-500/20 px-4 py-2.5 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-6 h-6" />
              <span className="text-base font-medium">{t('signOut')}</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

