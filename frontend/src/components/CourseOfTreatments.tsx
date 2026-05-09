import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarRange, Search, Settings, Plus, X, ChevronDown } from 'lucide-react';
import { appointmentService, type Appointment, type AppointmentFilters, patientService, type Patient, type CreatePatientDto, toothTreatmentService } from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('courseOfTreatments');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const dentistId = useMemo(() => Number(localStorage.getItem('dentistId') ?? 0), []);
  const isDirector = role === 'director';
  const isSingleDentist = role === 'singledentist' || role === 'single dentist';
  const isDentist = role === 'dentist' || isSingleDentist;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [directorDisplayName, setDirectorDisplayName] = useState('');
  const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
  const [dentistTreatmentAppointmentIds, setDentistTreatmentAppointmentIds] = useState<Set<number>>(new Set());
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
      setError(err?.response?.data?.message ?? t('errLoadAppointments'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDentistTreatmentAppointmentIds = async () => {
    if (!isDentist || !Number.isFinite(dentistId) || dentistId <= 0) {
      setDentistTreatmentAppointmentIds(new Set());
      return;
    }
    try {
      const dentistTreatments = await toothTreatmentService.getAll({ dentist: dentistId });
      const appointmentIds = new Set<number>();
      dentistTreatments.forEach((treatment) => {
        if (treatment.appointment?.id) {
          appointmentIds.add(treatment.appointment.id);
        }
      });
      setDentistTreatmentAppointmentIds(appointmentIds);
    } catch {
      setDentistTreatmentAppointmentIds(new Set());
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await patientService.getAll();
      setPatients(data);
    } catch (err: any) {
      setCreateError(t('errLoadPatients'));
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
    void fetchDentistTreatmentAppointmentIds();
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
      if (isDentist && !isSingleDentist && dentistFilterMode === 'mine') {
        result = result.filter((a) => dentistTreatmentAppointmentIds.has(a.id));
      }
      return result;
    },
    [rawAppointments, listMode, isDentist, isSingleDentist, dentistFilterMode, dentistTreatmentAppointmentIds],
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

  const appointmentDebt = (a: Appointment) => Math.max(0, a.calculatedFee - (a.chargedFee ?? 0));

  const courseTableColSpan = isDirector ? 6 : isSingleDentist ? 6 : isDentist ? 5 : 6;

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
      setCreateError(err?.response?.data?.message ?? t('errCreatePatient'));
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
        setCreateError(t('errRequiredStartPatient'));
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
      void fetchDentistTreatmentAppointmentIds();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? t('errCreateCourse'));
    } finally {
      setIsSubmittingCourse(false);
    }
  };

  const menuItems = isDirector ? DIRECTOR_PORTAL_MENU : DENTIST_PORTAL_MENU;
  const portalBadge = isDirector ? 'Admin Portal' : 'Dentist Portal';

  const subtitle =
    isDirector ? t('subtitleDirector') : isSingleDentist ? t('subtitleSingleDentist') : t('subtitleDentist');

  const userSubtitle = isDirector
    ? t('userDirector')
    : isSingleDentist
      ? t('userSolo')
      : t('userDentist');

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle={t('brandTitle')}
          portalBadge={portalBadge}
          userDisplayName={directorDisplayName || '-'}
          userSubtitle={userSubtitle}
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
                aria-label={t('staffSettingsAria')}
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
                  <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                  <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
                <div className="flex gap-2">
                  {isDentist ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(true);
                        setCreateError(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00588f]"
                    >
                      <Plus size={14} />
                      {t('createCourse')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void fetchAppointments()}
                    className="inline-flex items-center gap-2 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00588f]"
                  >
                    <CalendarRange size={14} />
                    {t('refresh')}
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
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">{t('patientName')}</label>
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
                      placeholder={t('searchByFirstName')}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">{t('patientSurname')}</label>
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
                      placeholder={t('searchBySurname')}
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
                      setListMode(e.target.value as AppointmentListMode);
                      setCurrentPage(1);
                    }}
                    className="appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 hover:border-slate-400 focus:border-[#0066A6] focus:outline-none focus:ring-2 focus:ring-[#cce0f0]"
                  >
                    <option value="open">{t('filterCurrent')}</option>
                    <option value="past">{t('filterPast')}</option>
                    <option value="all">{t('filterAll')}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
                </div>

                {isDentist && !isSingleDentist ? (
                  <div className="relative">
                    <select
                      value={dentistFilterMode}
                      onChange={(e) => {
                        setDentistFilterMode(e.target.value as DentistFilterMode);
                        setCurrentPage(1);
                      }}
                      className="appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 hover:border-slate-400 focus:border-[#0066A6] focus:outline-none focus:ring-2 focus:ring-[#cce0f0]"
                    >
                      <option value="mine">{t('filterMine')}</option>
                      <option value="all">{t('filterAll')}</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
                  </div>
                ) : null}
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
                        {isDentist && !isSingleDentist ? (
                          <>
                            <th className="px-4 py-3 text-right">{t('calcFee')}</th>
                            <th className="px-4 py-3 text-right">{t('benefit')}</th>
                          </>
                        ) : isSingleDentist ? (
                          <>
                            <th className="px-4 py-3 text-right">{t('calculated')}</th>
                            <th className="px-4 py-3 text-right">{t('debt')}</th>
                            <th className="px-4 py-3 text-right">{t('treatments')}</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-right">{t('calculated')}</th>
                            <th className="px-4 py-3 text-right">{t('charged')}</th>
                            <th className="px-4 py-3 text-right">{t('discount')}</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={courseTableColSpan}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            {t('loadingAppointments')}
                          </td>
                        </tr>
                      ) : pagedAppointments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={courseTableColSpan}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            {t('noAppointments')}
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
                                  returnLabel: t('backLabel'),
                                },
                              })
                            }
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">{appointment.startDate}</td>
                            <td className="px-4 py-3 text-slate-600">{appointment.endDate ?? '-'}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {appointment.patient.name} {appointment.patient.surname}
                            </td>
                            {isDentist && !isSingleDentist ? (
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
                            ) : isSingleDentist ? (
                              <>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  ${appointment.calculatedFee.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  ${appointmentDebt(appointment).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {appointment.treatmentCount ?? 0}
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
        </ClinicPortalShell>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('modalCreateTitle')}</h2>
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
                  {t('patientRequired')}
                </label>
                {!showAddPatientForm ? (
                  <>
                    <div className="space-y-2">
                      <select
                        id="patient"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      >
                        <option value="">{t('selectPatient')}</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.surname}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddPatientForm(true)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        {t('addNewPatient')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <label htmlFor="newName" className="mb-1 block text-xs font-medium text-gray-700">
                        {t('firstName')}
                      </label>
                      <input
                        type="text"
                        id="newName"
                        required
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        placeholder={t('searchByFirstName')}
                      />
                    </div>
                    <div>
                      <label htmlFor="newSurname" className="mb-1 block text-xs font-medium text-gray-700">
                        {t('surname')}
                      </label>
                      <input
                        type="text"
                        id="newSurname"
                        required
                        value={newPatient.surname}
                        onChange={(e) => setNewPatient({ ...newPatient, surname: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        placeholder={t('searchBySurname')}
                      />
                    </div>
                    <div>
                      <label htmlFor="newBirthDate" className="mb-1 block text-xs font-medium text-gray-700">
                        {t('birthDate')}
                      </label>
                      <input
                        type="date"
                        id="newBirthDate"
                        required
                        value={newPatient.birthDate}
                        onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddPatient}
                        disabled={isSubmittingPatient}
                        className="flex-1 rounded-lg bg-[#0066A6] py-2 text-sm font-medium text-white transition-colors hover:bg-[#00588f] disabled:opacity-50"
                      >
                        {isSubmittingPatient ? t('addingPatient') : t('addPatientSubmit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPatientForm(false);
                          setNewPatient({ name: '', surname: '', birthDate: '' });
                        }}
                        className="flex-1 rounded-lg bg-gray-200 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Course Details */}
              <div>
                <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('startDateRequired')}
                </label>
                <input
                  type="date"
                  id="startDate"
                  required
                  value={courseForm.startDate}
                  onChange={(e) => setCourseForm({ ...courseForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('endDateOptional')}
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={courseForm.endDate}
                  onChange={(e) => setCourseForm({ ...courseForm, endDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                />
              </div>

              <div>
                <label htmlFor="chargedFee" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('chargedFeeOptional')}
                </label>
                <input
                  type="number"
                  id="chargedFee"
                  step="0.01"
                  min="0"
                  value={courseForm.chargedFee}
                  onChange={(e) => setCourseForm({ ...courseForm, chargedFee: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCourse}
                  className="flex-1 rounded-lg bg-[#0066A6] py-2 font-medium text-white transition-colors hover:bg-[#00588f] disabled:opacity-50"
                >
                  {isSubmittingCourse ? t('creating') : t('createCourseSubmit')}
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
                  {t('cancel')}
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
