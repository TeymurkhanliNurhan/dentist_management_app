import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleHelp, LogOut } from 'lucide-react';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { DIRECTOR_PORTAL_MENU, isDirectorPortalNavActive } from '../lib/clinicPortalNav';
import { API_BASE_URL } from '../services/api';

export default function ClinicManagementLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [awaitingBlockingCount, setAwaitingBlockingCount] = useState(0);

  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';

  useEffect(() => {
    let cancelled = false;
    const fetchAwaitingCount = async () => {
      if (!isDirector) {
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
  }, [isDirector, pathname]);

  const menuItems = useMemo(
    () =>
      DIRECTOR_PORTAL_MENU.map((item) =>
        item.path === '/schedule'
          ? { ...item, notificationCount: awaitingBlockingCount }
          : item,
      ),
    [awaitingBlockingCount],
  );

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
            <span className="text-sm font-semibold text-slate-900">Clinic Management</span>
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
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                    isDirectorPortalNavActive(item.path, pathname)
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:bg-white/80'
                  }`}
                >
                  <span className="relative inline-flex">
                    <item.icon size={16} />
                    {item.notificationCount != null && item.notificationCount > 0 && (
                      <span className="absolute -right-2 -top-2 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white">
                        {item.notificationCount > 99 ? '99+' : item.notificationCount}
                      </span>
                    )}
                  </span>
                  {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                </button>
              ))}
            </nav>
            <div className="space-y-1 px-3">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
              >
                <CircleHelp size={16} />
                {isSidebarOpen && <span className="ml-3 truncate">Help</span>}
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
              >
                <LogOut size={16} />
                {isSidebarOpen && <span className="ml-3 truncate">Logout</span>}
              </button>
            </div>
          </div>
        </aside>
        <div className="relative h-[calc(100vh-4rem)] flex-1 overflow-auto bg-[#f9fafb] px-6 py-6">{children}</div>
      </div>
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          performLogout(navigate);
          setShowLogoutConfirm(false);
        }}
      />
    </div>
  );
}
