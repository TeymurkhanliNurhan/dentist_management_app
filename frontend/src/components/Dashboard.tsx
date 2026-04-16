import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_TILE_IMAGES, type DashboardTileKey } from '../lib/dashboardTileImages';
import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
  UserRound,
  Wallet,
} from 'lucide-react';
import api from '../services/api';

const TILE_IMAGE_QUERY = '?v=2';

interface StaffSummary {
  name?: string;
  surname?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const [directorStaff, setDirectorStaff] = useState<StaffSummary | null>(null);

  useEffect(() => {
    const fetchDirectorStaff = async () => {
      if (role !== 'director') {
        setDirectorStaff(null);
        return;
      }

      const staffIdRaw = localStorage.getItem('staffId');
      if (!staffIdRaw) {
        setDirectorStaff(null);
        return;
      }

      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) {
        setDirectorStaff(null);
        return;
      }

      try {
        const response = await api.get(`/staff?id=${staffId}`);
        const staff = Array.isArray(response.data) ? response.data[0] : response.data;
        setDirectorStaff({
          name: staff?.name,
          surname: staff?.surname,
        });
      } catch (error) {
        console.error('Failed to fetch director staff info:', error);
        setDirectorStaff(null);
      }
    };

    void fetchDirectorStaff();
  }, [role]);

  const directorDisplayName = `${directorStaff?.name ?? ''} ${directorStaff?.surname ?? ''}`.trim();

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

  if (role === 'director') {
    const directorMenuItems = [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Patients', icon: UserRound, path: '/patients' },
      { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
      { label: 'Inventory', icon: Package, path: '/medicines' },
      { label: 'Staff/Doctors', icon: Users, path: '/settings' },
      { label: 'Finance', icon: Wallet, path: '/appointments' },
    ];

    const directorFooterItems = [
      { label: 'Help', icon: CircleHelp },
      { label: 'Logout', icon: LogOut },
    ];

    return (
      <div className="min-h-screen bg-[#f4f6f8] text-slate-700">
        <header className="h-16 border-b border-slate-200 bg-white px-6">
          <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label={isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
              >
                {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              </button>
              <span className="text-sm font-semibold text-slate-900">Precision Dental</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Admin Portal
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Open settings"
              >
                <Settings size={16} />
              </button>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <div className="h-7 w-7 rounded-full bg-slate-200" />
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-700">{directorDisplayName || '-'}</p>
                  <p className="text-[10px] text-slate-400">Clinic Director</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1600px]">
          <aside
            className={`relative border-r border-slate-200 bg-[#f0f3f7] transition-all duration-300 ${
              isSidebarOpen ? 'w-64' : 'w-20'
            }`}
          >
            <div className="flex h-[calc(100vh-4rem)] flex-col justify-between py-6">
              <nav className="space-y-1 px-3">
                {directorMenuItems.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                      index === 0
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:bg-white/80'
                    }`}
                  >
                    <item.icon size={16} />
                    {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                  </button>
                ))}
              </nav>

              <div className="space-y-1 px-3">
                {directorFooterItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
                  >
                    <item.icon size={16} />
                    {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="h-[calc(100vh-4rem)] flex-1 bg-[#f9fafb]" />
        </div>
      </div>
    );
  }

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

