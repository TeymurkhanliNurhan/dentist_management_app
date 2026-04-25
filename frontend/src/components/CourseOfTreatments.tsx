import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarRange, Search, Settings, Plus, X } from 'lucide-react';
import { appointmentService, type Appointment, type AppointmentFilters, patientService, type Patient, type CreatePatientDto } from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

const PAGE_SIZE = 12;

type AppointmentListMode = 'open' | 'past' | 'all';
type DentistFilterMode = 'mine' | 'all';

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function filterAppointmentsByEnd(appointments: Appointment[], mode: AppointmentListMode): Appointment[] {
  const today = localDateString();
  if (mode === 'past') {
    return appointments.filter((a) => a.endDate != null && a.endDate < today);
  }
  if (mode === 'open') {
    return appointments.filter((a) => a.endDate == null);
  }
  return appointments;
}

export default function CourseOfTreatments() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const dentistId = useMemo(() => Number(localStorage.getItem('dentistId') ?? 0), []);
  const isDirector = role === 'director';
  const isDentist = role === 'dentist';

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [directorDisplayName, setDirectorDisplayName] = useState('');
  const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
  const [listMode, setListMode] = useState<AppointmentListMode>('open');
  const [dentistFilterMode, setDentistFilterMode] = useState<DentistFilterMode>('mine');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AppointmentFilters>({
    startDate: '',
    patientName: '',
    patientSurname: '',
  });

  // Create course modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [courseForm, setCourseForm] = useState({
    startDate: '',
    endDate: '',
    chargedFee: '',
  });
  const [newPatient, setNewPatient] = useState<CreatePatientDto>({
    name: '',
    surname: '',
    birthDate: '',
  });
  const [isSubmittingCourse, setIsSubmittingCourse] = useState(false);
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchAppointments = async (nextFilters?: AppointmentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getAll(nextFilters ?? filters);
      setRawAppointments(response.appointments ?? []);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (err: any) {
      setCreateError('Failed to load patients');
    }
  };

  useEffect(() => {
    if (!isDirector && !isDentist) {
      navigate('/dashboard');
      return;
    }
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDirectorDisplayName(`${staffName} ${staffSurname}`.trim());
    void fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector, isDentist, navigate]);

  useEffect(() => {
    if (showCreateModal) {
      void fetchPatients();
    }
  }, [showCreateModal]);

  const filteredAppointments = useMemo(
    () => {
      let result = filterAppointmentsByEnd(rawAppointments, listMode);
      // For dentist view, filter by "mine" if selected
      if (isDentist && dentistFilterMode === 'mine') {
        result = result.filter((a) => a.dentist?.id === dentistId);
      }
      return result;
    },
    [rawAppointments, listMode, isDentist, dentistFilterMode, dentistId],
  );

  const totalFiltered = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pagedAppointments = filteredAppointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const calculateBenefit = (appointment: Appointment) => {
    if (appointment.treatmentPercentage === null || appointment.treatmentPercentage === undefined) {
      return null;
    }
    return appointment.calculatedFee * (appointment.treatmentPercentage / 100);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPatient(true);
    setCreateError('');
    try {
      const created = await patientService.create(newPatient);
      setNewPatient({ name: '', surname: '', birthDate: '' });
      setShowAddPatientForm(false);
      setSelectedPatientId(created.id);
      setPatients([...patients, created]);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create patient');
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCourse(true);
    setCreateError('');
    try {
      if (!courseForm.startDate || selectedPatientId === '') {
        setCreateError('Start date and patient are required');
        setIsSubmittingCourse(false);
        return;
      }

      await appointmentService.create({
        startDate: courseForm.startDate,
        endDate: courseForm.endDate || undefined,
        chargedFee: courseForm.chargedFee ? parseFloat(courseForm.chargedFee) : undefined,
        patient_id: Number(selectedPatientId),
      });

      setShowCreateModal(false);
      setCourseForm({ startDate: '', endDate: '', chargedFee: '' });
      setSelectedPatientId('');
      setNewPatient({ name: '', surname: '', birthDate: '' });
      setShowAddPatientForm(false);
      void fetchAppointments();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? 'Failed to create course of treatment');
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  const menuItems = isDirector ? DIRECTOR_PORTAL_MENU : DENTIST_PORTAL_MENU;
  const portalBadge = isDirector ? 'Admin Portal' : 'Dentist Portal';

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Precision Dental"
          portalBadge={portalBadge}
          userDisplayName={directorDisplayName || '-'}
          userSubtitle={isDirector ? 'Clinic Director' : 'Dentist'}
          menuItems={menuItems}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          headerActions={
            isDirector ? (
              <button
                type="button"
                onClick={() => navigate('/staff')}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Staff and doctors"
              >
                <Settings size={16} />
              </button>
            ) : undefined
          }
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-7xl space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Course of Treatments</h1>
                  <p className="text-sm text-slate-500">
                    {isDirector
                      ? 'Appointments across all dentists in your clinic'
                      : 'Your treatment appointments'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isDentist ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(true);
                        setCreateError(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <Plus size={14} />
                      Create Course
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void fetchAppointments()}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    <CalendarRange size={14} />
                    Refresh
                  </button>
                </div>
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

              <div className="flex flex-wrap gap-2">
                {(['open', 'past', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setListMode(mode);
                      setCurrentPage(1);
                    }}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                      listMode === mode
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'open' ? 'Current' : mode === 'past' ? 'Past' : 'All'}
                  </button>
                ))}

                {isDentist && (
                  <>
                    {(['mine', 'all'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setDentistFilterMode(mode);
                          setCurrentPage(1);
                        }}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                          dentistFilterMode === mode
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {mode === 'mine' ? 'Mine' : 'All'}
                      </button>
                    ))}
                  </>
                )}
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
                        <th className="px-4 py-3 text-left">Start date</th>
                        <th className="px-4 py-3 text-left">End date</th>
                        <th className="px-4 py-3 text-left">Patient</th>
                        {isDentist ? (
                          <>
                            <th className="px-4 py-3 text-right">Calculated Fee</th>
                            <th className="px-4 py-3 text-right">Benefit</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-right">Calculated</th>
                            <th className="px-4 py-3 text-right">Charged</th>
                            <th className="px-4 py-3 text-right">Discount</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={isDentist ? 5 : 6}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            Loading appointments...
                          </td>
                        </tr>
                      ) : pagedAppointments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isDentist ? 5 : 6}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            No appointments found.
                          </td>
                        </tr>
                      ) : (
                        pagedAppointments.map((appointment) => (
                          <tr
                            key={appointment.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() =>
                              navigate(`/appointments/${appointment.id}`, {
                                state: {
                                  returnTo: `${location.pathname}${location.search}${location.hash}`,
                                  returnLabel: 'Back to Course of Treatments',
                                },
                              })
                            }
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">{appointment.startDate}</td>
                            <td className="px-4 py-3 text-slate-600">{appointment.endDate ?? '-'}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {appointment.patient.name} {appointment.patient.surname}
                            </td>
                            {isDentist ? (
                              <>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {appointment.calculatedFee > 0
                                    ? `$${appointment.calculatedFee.toFixed(2)}`
                                    : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {appointment.calculatedFee > 0 && calculateBenefit(appointment) !== null
                                    ? `$${calculateBenefit(appointment)!.toFixed(2)}`
                                    : '-'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  ${appointment.calculatedFee.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {appointment.chargedFee != null ? `$${appointment.chargedFee.toFixed(2)}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {appointment.discountFee != null ? `$${appointment.discountFee.toFixed(2)}` : '-'}
                                </td>
                              </>
                            )}
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
                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalFiltered)} of{' '}
                    {totalFiltered}
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

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create Course of Treatment</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                  setCourseForm({ startDate: '', endDate: '', chargedFee: '' });
                  setSelectedPatientId('');
                  setShowAddPatientForm(false);
                  setNewPatient({ name: '', surname: '', birthDate: '' });
                }}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label htmlFor="patient" className="mb-1 block text-sm font-medium text-gray-700">
                  Patient *
                </label>
                {!showAddPatientForm ? (
                  <>
                    <div className="space-y-2">
                      <select
                        id="patient"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select a patient...</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.surname}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddPatientForm(true)}
                        className="w-full rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
                      >
                        + Add New Patient
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
                    <div>
                      <label htmlFor="newName" className="mb-1 block text-xs font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="newName"
                        required
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label htmlFor="newSurname" className="mb-1 block text-xs font-medium text-gray-700">
                        Surname
                      </label>
                      <input
                        type="text"
                        id="newSurname"
                        required
                        value={newPatient.surname}
                        onChange={(e) => setNewPatient({ ...newPatient, surname: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Surname"
                      />
                    </div>
                    <div>
                      <label htmlFor="newBirthDate" className="mb-1 block text-xs font-medium text-gray-700">
                        Birth Date
                      </label>
                      <input
                        type="date"
                        id="newBirthDate"
                        required
                        value={newPatient.birthDate}
                        onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddPatient}
                        disabled={isSubmittingPatient}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSubmittingPatient ? 'Adding...' : 'Add Patient'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPatientForm(false);
                          setNewPatient({ name: '', surname: '', birthDate: '' });
                        }}
                        className="flex-1 rounded-lg bg-gray-200 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Course Details */}
              <div>
                <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  required
                  value={courseForm.startDate}
                  onChange={(e) => setCourseForm({ ...courseForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-700">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={courseForm.endDate}
                  onChange={(e) => setCourseForm({ ...courseForm, endDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="chargedFee" className="mb-1 block text-sm font-medium text-gray-700">
                  Charged Fee (Optional)
                </label>
                <input
                  type="number"
                  id="chargedFee"
                  step="0.01"
                  min="0"
                  value={courseForm.chargedFee}
                  onChange={(e) => setCourseForm({ ...courseForm, chargedFee: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCourse}
                  className="flex-1 rounded-lg bg-green-600 py-2 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmittingCourse ? 'Creating...' : 'Create Course'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                    setCourseForm({ startDate: '', endDate: '', chargedFee: '' });
                    setSelectedPatientId('');
                    setShowAddPatientForm(false);
                    setNewPatient({ name: '', surname: '', birthDate: '' });
                  }}
                  className="flex-1 rounded-lg bg-gray-200 py-2 font-medium text-gray-700 transition hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
