import Header from './Header';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_TILE_IMAGES, type DashboardTileKey } from '../lib/dashboardTileImages';
import { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';

const TILE_IMAGE_QUERY = '?v=2';

interface StaffSummary {
  name?: string;
  surname?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const [directorStaff, setDirectorStaff] = useState<StaffSummary | null>(null);
  const [awaitingBlockingCount, setAwaitingBlockingCount] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    const fetchAwaitingCount = async () => {
      if (role !== 'director') {
        setAwaitingBlockingCount(0);
        return;
      }
      const token = localStorage.getItem('access_token') || '';
      try {
        const res = await fetch(`${API_BASE_URL}/blocking-hours`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        const count = Array.isArray(data)
          ? data.filter((x) => x?.approvalStatus === 'awaiting').length
          : 0;
        if (!cancelled) setAwaitingBlockingCount(count);
      } catch {
        if (!cancelled) setAwaitingBlockingCount(0);
      }
    };

    void fetchAwaitingCount();
    const timer = window.setInterval(() => {
      void fetchAwaitingCount();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [location.pathname, role]);

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
    return (
      <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Precision Dental"
          portalBadge="Admin Portal"
          userDisplayName={directorDisplayName}
          userSubtitle="Clinic Director"
          menuItems={DIRECTOR_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          scheduleNotificationCount={awaitingBlockingCount}
          headerActions={
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Staff and doctors"
            >
              <Settings size={16} />
            </button>
          }
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb]" />
        </ClinicPortalShell>
      </div>
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          performLogout(navigate);
          setShowLogoutConfirm(false);
        }}
      />
      </>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-blue-50">
      <Header />
      
      <main className="min-h-0 flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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

