import { useState, useEffect, useRef } from 'react';
import { Home, Settings, Mail, LogOut, Globe } from 'lucide-react';
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

  return (
    <header className="bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-12">
            <h1 className="text-4xl font-bold text-white tracking-tight">{t('appTitle')}</h1>
            {dentistSurname && (
              <span className="text-2xl font-semibold text-white">
                Dr. {dentistSurname}
              </span>
            )}
          </div>

          <nav className="flex items-center space-x-8">
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

              {/* Language Switcher */}
              <div className="relative" ref={languageMenuRef}>
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all duration-200"
                  aria-label="Change language"
                >
                  <Globe className="w-6 h-6" />
                </button>
                {showLanguageMenu && (
                  <div className="absolute top-14 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[120px] z-50">
                    <button
                      onClick={() => {
                        i18n.changeLanguage('en');
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                        i18n.language === 'en' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        i18n.changeLanguage('az');
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                        i18n.language === 'az' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      Azərbaycan
                    </button>
                    <button
                      onClick={() => {
                        i18n.changeLanguage('ru');
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                        i18n.language === 'ru' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      Русский
                    </button>
                  </div>
                )}
              </div>

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

