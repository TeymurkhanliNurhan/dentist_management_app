import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CalendarRange, ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  appointmentService,
  patientService,
  type Appointment,
  type AppointmentFilters,
} from '../services/api';
import { getPatientId, isPatientSession } from '../lib/patientSession';
import {
  getStoredPatientCourseListMode,
  storePatientCourseListMode,
  type PatientCourseListMode,
} from '../lib/patientCourseListMode';
import { PatientPortalShell } from './PatientPortalShell';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

const PAGE_SIZE = 12;
const COURSES_PATH = '/course-of-treatments';

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function filterAppointmentsByEnd(appointments: Appointment[], mode: PatientCourseListMode): Appointment[] {
  const today = localDateString();
  if (mode === 'past') {
    return appointments.filter((a) => a.endDate != null && a.endDate < today);
  }
  if (mode === 'open') {
    return appointments.filter((a) => a.endDate == null);
  }
  return appointments;
}

function appointmentDebt(appointment: Appointment): number {
  return Math.max(0, appointment.calculatedFee - (appointment.chargedFee ?? 0));
}

function resolveInitialListMode(locationState: unknown): PatientCourseListMode {
  const fromNav = (locationState as { listMode?: PatientCourseListMode } | null)?.listMode;
  if (fromNav === 'open' || fromNav === 'past' || fromNav === 'all') return fromNav;
  return getStoredPatientCourseListMode();
}

export default function PatientCourseOfTreatments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('courseOfTreatments');
  const patientId = getPatientId();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
  const [listMode, setListMode] = useState<PatientCourseListMode>(() => resolveInitialListMode(location.state));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AppointmentFilters>({ startDate: '' });

  const fetchAppointments = async (nextFilters?: AppointmentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getAll(nextFilters ?? filters);
      setRawAppointments(response.appointments ?? []);
      setCurrentPage(1);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message ?? t('errLoadAppointments'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fromNav = (location.state as { listMode?: PatientCourseListMode } | null)?.listMode;
    if (fromNav === 'open' || fromNav === 'past' || fromNav === 'all') {
      setListMode(fromNav);
      storePatientCourseListMode(fromNav);
    }
  }, [location.state]);

  useEffect(() => {
    storePatientCourseListMode(listMode);
  }, [listMode]);

  useEffect(() => {
    if (!patientId) return;
    void patientService
      .getById(patientId)
      .then((p) => setUserDisplayName(`${p.name} ${p.surname}`.trim()))
      .catch(() => setUserDisplayName(''));
    void fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const filteredAppointments = useMemo(
    () => filterAppointmentsByEnd(rawAppointments, listMode),
    [rawAppointments, listMode],
  );

  const totalFiltered = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedAppointments = filteredAppointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const tableColSpan = 6;

  if (!isPatientSession() || !patientId) {
    return <Navigate to="/patient/login" replace />;
  }

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <PatientPortalShell
          userDisplayName={userDisplayName}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-7xl space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                  <p className="text-sm text-slate-500">{t('subtitlePatient')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchAppointments()}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00588f]"
                >
                  <CalendarRange size={14} />
                  {t('refresh')}
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchAppointments(filters);
                }}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">{t('date')}</label>
                    <input
                      type="date"
                      value={filters.startDate ?? ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0066A6] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00588f]"
                    >
                      <Search size={14} />
                      {t('search')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextFilters: AppointmentFilters = { startDate: '' };
                        setFilters(nextFilters);
                        void fetchAppointments(nextFilters);
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {t('clear')}
                    </button>
                  </div>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <select
                    value={listMode}
                    onChange={(e) => {
                      setListMode(e.target.value as PatientCourseListMode);
                      setCurrentPage(1);
                    }}
                    className="appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 hover:border-slate-400 focus:border-[#0066A6] focus:outline-none focus:ring-2 focus:ring-[#cce0f0]"
                  >
                    <option value="all">{t('filterAll')}</option>
                    <option value="open">{t('filterCurrent')}</option>
                    <option value="past">{t('filterPast')}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">{t('tableStartDate')}</th>
                        <th className="px-4 py-3 text-left">{t('tableEndDate')}</th>
                        <th className="px-4 py-3 text-left">{t('tablePatient')}</th>
                        <th className="px-4 py-3 text-right">{t('calculated')}</th>
                        <th className="px-4 py-3 text-right">{t('charged')}</th>
                        <th className="px-4 py-3 text-right">{t('debt')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={tableColSpan} className="px-4 py-8 text-center text-slate-500">
                            {t('loadingAppointments')}
                          </td>
                        </tr>
                      ) : pagedAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={tableColSpan} className="px-4 py-8 text-center text-slate-500">
                            {t('noAppointments')}
                          </td>
                        </tr>
                      ) : (
                        pagedAppointments.map((appointment) => (
                          <tr
                            key={appointment.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() =>
                              navigate(`${COURSES_PATH}/${appointment.id}`, {
                                state: {
                                  returnTo: `${location.pathname}${location.search}${location.hash}`,
                                  returnLabel: t('backLabel'),
                                  listMode,
                                },
                              })
                            }
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">{appointment.startDate}</td>
                            <td className="px-4 py-3 text-slate-600">{appointment.endDate ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-400">—</td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              ${appointment.calculatedFee.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {appointment.chargedFee != null ? `$${appointment.chargedFee.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              ${appointmentDebt(appointment).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <p className="text-slate-500">
                    {t('paginationShowing', {
                      from: (page - 1) * PAGE_SIZE + 1,
                      to: Math.min(page * PAGE_SIZE, totalFiltered),
                      total: totalFiltered,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('prev')}
                    </button>
                    <span className="text-slate-600">
                      {t('pageOf', { page, total: totalPages })}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('next')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </main>
        </PatientPortalShell>
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
