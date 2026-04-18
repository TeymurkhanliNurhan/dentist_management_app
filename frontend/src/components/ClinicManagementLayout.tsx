import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Package,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', icon: UserRound, path: '/patients' },
  { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { label: 'Services', icon: Package, path: '/treatments' },
  { label: 'Inventory', icon: Package, path: '/medicines' },
  { label: 'Staff/Doctors', icon: Users, path: '/settings' },
  { label: 'Finance', icon: Wallet, path: '/appointments' },
] as const;

function isNavActive(itemPath: string, pathname: string): boolean {
  if (pathname === itemPath) return true;
  if (itemPath !== '/' && pathname.startsWith(`${itemPath}/`)) return true;
  return false;
}

function signOutAndRedirect(navigate: ReturnType<typeof useNavigate>) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('dentistId');
  localStorage.removeItem('staffId');
  localStorage.removeItem('clinicId');
  localStorage.removeItem('role');
  navigate('/login');
}

export default function ClinicManagementLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
                    isNavActive(item.path, pathname)
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
                onClick={() => signOutAndRedirect(navigate)}
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
    </div>
  );
}
