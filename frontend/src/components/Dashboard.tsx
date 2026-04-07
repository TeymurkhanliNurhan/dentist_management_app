import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_TILE_IMAGES, type DashboardTileKey } from '../lib/dashboardTileImages';

const TILE_IMAGE_QUERY = '?v=2';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  const services: { nameKey: DashboardTileKey; image: string; path: string }[] = [
    {
      nameKey: 'appointments',
      path: '/appointments',
      image: `${DASHBOARD_TILE_IMAGES.appointments}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'patients',
      path: '/patients',
      image: `${DASHBOARD_TILE_IMAGES.patients}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'treatments',
      path: '/treatments',
      image: `${DASHBOARD_TILE_IMAGES.treatments}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'medicines',
      path: '/medicines',
      image: `${DASHBOARD_TILE_IMAGES.medicines}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'schedule',
      path: '/schedule',
      image: `${DASHBOARD_TILE_IMAGES.schedule}${TILE_IMAGE_QUERY}`,
    },
  ];

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">{t('ourServices')}</h1>
          <div className="w-20 h-1 bg-teal-500 mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12 px-8">
          {services.map((service) => (
            <div
              key={service.nameKey}
              onClick={() => navigate(service.path)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-48 h-48 mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <img
                  src={service.image}
                  alt={t(service.nameKey)}
                  className="w-full h-full object-contain"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform:
                      service.nameKey === 'treatments'
                        ? 'scale(1.3)'
                        : service.nameKey === 'patients'
                          ? 'scale(0.8)'
                          : 'scale(1)',
                  }}
                />
              </div>
              <h3 className="text-xl font-bold text-teal-700 uppercase tracking-wide">
                {t(service.nameKey)}
              </h3>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

