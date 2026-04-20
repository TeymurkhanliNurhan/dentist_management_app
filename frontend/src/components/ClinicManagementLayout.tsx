import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleHelp, LogOut } from 'lucide-react';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { DIRECTOR_PORTAL_MENU, isDirectorPortalNavActive } from '../lib/clinicPortalNav';

export default function ClinicManagementLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
              {DIRECTOR_PORTAL_MENU.map((item) => (
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
                  <item.icon size={16} />
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
