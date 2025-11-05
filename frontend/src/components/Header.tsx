import { useState, useEffect } from 'react';
import { Settings, Mail, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dentistService } from '../services/api';

const Header = () => {
  const navigate = useNavigate();
  const [dentistSurname, setDentistSurname] = useState<string>('');

  useEffect(() => {
    const fetchDentistInfo = async () => {
      try {
        const dentistId = localStorage.getItem('dentistId');
        if (dentistId) {
          const dentist = await dentistService.getById(parseInt(dentistId));
          setDentistSurname(dentist.surname);
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
            <h1 className="text-4xl font-bold text-white tracking-tight">Dişçi</h1>
            {dentistSurname && (
              <span className="text-2xl font-semibold text-white">
                Dr. {dentistSurname}
              </span>
            )}
          </div>

          <nav className="flex items-center space-x-8">
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all duration-200"
              >
                <Settings className="w-6 h-6" />
                <span className="text-base font-medium">Settings</span>
              </button>

              <button
                onClick={() => navigate('/contact')}
                className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all duration-200"
              >
                <Mail className="w-6 h-6" />
                <span className="text-base font-medium">Contact</span>
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-red-500/20 px-4 py-2.5 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-6 h-6" />
                <span className="text-base font-medium">Sign Out</span>
              </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

