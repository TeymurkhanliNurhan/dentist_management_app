import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, FileText, LogOut, Stethoscope } from 'lucide-react';
import { PortalLanguageSwitcher } from './PortalLanguageSwitcher';
import { getPatientHomePath } from '../lib/patientSession';

export type PatientPortalShellProps = {
  userDisplayName: string;
  pathname: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  navigate: NavigateFunction;
  children: ReactNode;
  onLogoutClick: () => void;
};

export function PatientPortalShell({
  userDisplayName,
  pathname,
  isSidebarOpen,
  setIsSidebarOpen,
  navigate,
  children,
  onLogoutClick,
}: PatientPortalShellProps) {
  const { t } = useTranslation('header');
  const homePath = getPatientHomePath() ?? pathname;
  const coursesPath = '/course-of-treatments';
  const treatmentsPath = '/treatments';
  const schedulePath = '/schedule';
  const collapseLabel = isSidebarOpen ? 'Collapse menu' : 'Expand menu';
  const isMyRecordsActive =
    (pathname === homePath || pathname.startsWith(`${homePath}/`)) &&
    !pathname.startsWith(coursesPath) &&
    !pathname.startsWith(treatmentsPath) &&
    !pathname.startsWith(schedulePath);
  const isCoursesActive =
    pathname === coursesPath || pathname.startsWith(`${coursesPath}/`);
  const isTreatmentsActive =
    pathname === treatmentsPath || pathname.startsWith(`${treatmentsPath}/`);
  const isScheduleActive =
    pathname === schedulePath || pathname.startsWith(`${schedulePath}/`);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-slate-200 bg-white px-6">
        <div className="flex h-full w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="shrink-0 rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label={collapseLabel}
            >
              {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
            <span className="truncate text-sm font-semibold text-slate-900">{t('brandPrecisionDental')}</span>
            <span className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:inline">
              {t('portalBadgePatient')}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <PortalLanguageSwitcher />
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-semibold text-slate-700">{userDisplayName || '-'}</p>
                <p className="truncate text-[10px] text-slate-400">{t('rolePatient')}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 w-full overflow-hidden bg-[#f4f6f8]">
        <aside
          className={`relative shrink-0 border-r border-slate-200 bg-[#f0f3f7] transition-all duration-300 ${
            isSidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="flex h-full min-h-0 flex-col py-6">
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
              <button
                type="button"
                onClick={() => navigate(homePath)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                  isMyRecordsActive
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:bg-white/80'
                }`}
              >
                <FileText size={16} className="shrink-0" />
                {isSidebarOpen ? <span className="ml-3 truncate">{t('navMyRecords')}</span> : null}
              </button>
              <button
                type="button"
                onClick={() => navigate(schedulePath)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                  isScheduleActive
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:bg-white/80'
                }`}
              >
                <CalendarDays size={16} className="shrink-0" />
                {isSidebarOpen ? <span className="ml-3 truncate">{t('navSchedule')}</span> : null}
              </button>
              <button
                type="button"
                onClick={() => navigate(coursesPath)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                  isCoursesActive
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:bg-white/80'
                }`}
              >
                <CalendarRange size={16} className="shrink-0" />
                {isSidebarOpen ? (
                  <span className="ml-3 truncate">{t('navCourseOfTreatments')}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => navigate(treatmentsPath)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                  isTreatmentsActive
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:bg-white/80'
                }`}
              >
                <Stethoscope size={16} className="shrink-0" />
                {isSidebarOpen ? (
                  <span className="ml-3 truncate">{t('navTreatments')}</span>
                ) : null}
              </button>
            </nav>

            <div className="mt-auto shrink-0 space-y-1 border-t border-slate-200/80 px-3 pt-4">
              <button
                type="button"
                onClick={onLogoutClick}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
              >
                <LogOut size={16} className="shrink-0" />
                {isSidebarOpen ? <span className="ml-3 truncate">{t('signOut')}</span> : null}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
