import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleHelp, LogOut, Menu } from 'lucide-react';
import type { ClinicPortalMenuItem } from '../lib/clinicPortalNav';
import { isDirectorPortalNavActive } from '../lib/clinicPortalNav';

type CollapseToggleVariant = 'chevron' | 'menu';

export type ClinicPortalShellProps = {
  brandTitle: string;
  portalBadge?: string;
  userDisplayName: string;
  userSubtitle: string;
  menuItems: ClinicPortalMenuItem[];
  pathname: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  navigate: NavigateFunction;
  children: ReactNode;
  headerCenter?: ReactNode;
  headerActions?: ReactNode;
  onLogoutClick: () => void;
  showProfileStrip?: boolean;
  collapseToggleVariant?: CollapseToggleVariant;
  asideHeightClassName?: string;
  scheduleNotificationCount?: number;
};

export function ClinicPortalShell({
  brandTitle,
  portalBadge,
  userDisplayName,
  userSubtitle,
  menuItems,
  pathname,
  isSidebarOpen,
  setIsSidebarOpen,
  navigate,
  children,
  headerCenter,
  headerActions,
  onLogoutClick,
  showProfileStrip = true,
  collapseToggleVariant = 'chevron',
  asideHeightClassName = 'h-[calc(100vh-4rem)]',
  scheduleNotificationCount = 0,
}: ClinicPortalShellProps) {
  const collapseLabel = isSidebarOpen ? 'Collapse menu' : 'Expand menu';

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white px-6">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="shrink-0 rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label={collapseLabel}
            >
              {collapseToggleVariant === 'menu' ? (
                <Menu size={16} />
              ) : isSidebarOpen ? (
                <ChevronLeft size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
            <span className="truncate text-sm font-semibold text-slate-900">{brandTitle}</span>
            {portalBadge ? (
              <span className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:inline">
                {portalBadge}
              </span>
            ) : null}
          </div>

          {headerCenter ? <div className="hidden min-w-0 flex-1 justify-center lg:flex">{headerCenter}</div> : null}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {headerActions}
            {showProfileStrip ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-semibold text-slate-700">{userDisplayName || '-'}</p>
                  <p className="truncate text-[10px] text-slate-400">{userSubtitle}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] min-h-[calc(100vh-4rem)]">
        <aside
          className={`relative border-r border-slate-200 bg-[#f0f3f7] transition-all duration-300 ${
            isSidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className={`flex ${asideHeightClassName} flex-col justify-between py-6`}>
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                    isDirectorPortalNavActive(item.path, pathname)
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:bg-white/80'
                  }`}
                >
                  <span className="relative inline-flex">
                    <item.icon size={16} className="shrink-0" />
                    {item.path === '/schedule' && scheduleNotificationCount > 0 && (
                      <span className="absolute -right-2 -top-2 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white">
                        {scheduleNotificationCount > 99 ? '99+' : scheduleNotificationCount}
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
                <CircleHelp size={16} className="shrink-0" />
                {isSidebarOpen && <span className="ml-3 truncate">Help</span>}
              </button>
              <button
                type="button"
                onClick={onLogoutClick}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
              >
                <LogOut size={16} className="shrink-0" />
                {isSidebarOpen && <span className="ml-3 truncate">Logout</span>}
              </button>
            </div>
          </div>
        </aside>

        {children}
      </div>
    </>
  );
}
