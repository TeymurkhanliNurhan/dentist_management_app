import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarRange, Search, Settings } from 'lucide-react';
import { appointmentService, type Appointment, type AppointmentFilters } from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

const PAGE_SIZE = 12;

type AppointmentWithDentist = Appointment & {
  dentist?: {
    id?: number;
    staff?: {
      name?: string | null;
      surname?: string | null;
    } | null;
    name?: string | null;
    surname?: string | null;
  } | null;
};

function getDentistLabel(appointment: AppointmentWithDentist): string {
  const staffName = appointment.dentist?.staff?.name ?? appointment.dentist?.name ?? '';
  const staffSurname = appointment.dentist?.staff?.surname ?? appointment.dentist?.surname ?? '';
  const fullName = `${staffName} ${staffSurname}`.trim();
  return fullName || 'Not assigned';
}

export default function CourseOfTreatments() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const isDirector = role === 'director';

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [directorDisplayName, setDirectorDisplayName] = useState('');
  const [appointments, setAppointments] = useState<AppointmentWithDentist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AppointmentFilters>({
    startDate: '',
    patientName: '',
    patientSurname: '',
  });

  const fetchAppointments = async (nextFilters?: AppointmentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getAll(nextFilters ?? filters);
      setAppointments((response.appointments ?? []) as AppointmentWithDentist[]);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDirector) {
      navigate('/appointments');
      return;
    }
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDirectorDisplayName(`${staffName} ${staffSurname}`.trim());
    void fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector, navigate]);

  const totalPages = Math.max(1, Math.ceil(appointments.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedAppointments = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="min-h-screen bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Precision Dental"
          portalBadge="Admin Portal"
          userDisplayName={directorDisplayName || '-'}
          userSubtitle="Clinic Director"
          menuItems={DIRECTOR_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
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
          <main className="flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-7xl space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Course of Treatments</h1>
                  <p className="text-sm text-slate-500">
                    Appointments across all dentists in your clinic
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchAppointments()}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  <CalendarRange size={14} />
                  Refresh
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchAppointments(filters);
                }}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Date</label>
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
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Patient name</label>
                    <input
                      type="text"
                      value={filters.patientName ?? ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          patientName: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Search by first name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Patient surname</label>
                    <input
                      type="text"
                      value={filters.patientSurname ?? ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          patientSurname: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Search by surname"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      <Search size={14} />
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextFilters: AppointmentFilters = {
                          startDate: '',
                          patientName: '',
                          patientSurname: '',
                        };
                        setFilters(nextFilters);
                        void fetchAppointments(nextFilters);
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </form>

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
                        <th className="px-4 py-3 text-left">Start date</th>
                        <th className="px-4 py-3 text-left">End date</th>
                        <th className="px-4 py-3 text-left">Patient</th>
                        <th className="px-4 py-3 text-left">Dentist</th>
                        <th className="px-4 py-3 text-right">Calculated</th>
                        <th className="px-4 py-3 text-right">Charged</th>
                        <th className="px-4 py-3 text-right">Discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            Loading appointments...
                          </td>
                        </tr>
                      ) : pagedAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            No appointments found.
                          </td>
                        </tr>
                      ) : (
                        pagedAppointments.map((appointment) => (
                          <tr
                            key={appointment.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => navigate(`/appointments/${appointment.id}`)}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">{appointment.startDate}</td>
                            <td className="px-4 py-3 text-slate-600">{appointment.endDate ?? '-'}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {appointment.patient.name} {appointment.patient.surname}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{getDentistLabel(appointment)}</td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              ${appointment.calculatedFee.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {appointment.chargedFee != null ? `$${appointment.chargedFee.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {appointment.discountFee != null ? `$${appointment.discountFee.toFixed(2)}` : '-'}
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
                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, appointments.length)} of{' '}
                    {appointments.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-slate-600">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </main>
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
