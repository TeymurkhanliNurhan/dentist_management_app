import { useMemo, useState, useEffect } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU, FRONTDESK_PORTAL_MENU } from '../lib/clinicPortalNav';
import { appLocaleTag, formatDateDdMmYyyy } from '../lib/localeHelpers';
import { appointmentService, dentistService, patientService, toothTreatmentService } from '../services/api';
import type { Patient, PatientFilters, CreatePatientDto, ToothTreatment } from '../services/api';
import { useTranslation } from 'react-i18next';

type PortalPatientRow = Patient & {
  treatmentCount: number;
  totalDebt: number;
};

const DIRECTOR_PAGE_SIZE = 7;

const Patients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('patients');
  const { t: tCommon } = useTranslation('common');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';
  const isReception = role === 'frontdesk';
  const isDirectorOrReception = isDirector || isReception;
  const isDentist = role === 'dentist' || role === 'singledentist' || role === 'single dentist';
  const usePatientsPortalShell = isDirectorOrReception || isDentist;
  const [dentistPortalDisplayName, setDentistPortalDisplayName] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatmentCountsByPatient, setTreatmentCountsByPatient] = useState<Record<number, number>>({});
  const [debtByPatient, setDebtByPatient] = useState<Record<number, number>>({});
  const [filters, setFilters] = useState<PatientFilters>({
    name: '',
    surname: '',
    birthdate: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState<CreatePatientDto>({
    name: '',
    surname: '',
    birthDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchPortalPatientAggregates = async () => {
    const [appointmentsData, toothTreatments] = await Promise.all([
      appointmentService.getAll(),
      toothTreatmentService.getAll(),
    ]);

    const debtMap: Record<number, number> = {};
    if (isDirectorOrReception || isDentist) {
      for (const appointment of appointmentsData.appointments) {
        const patientId = appointment.patient?.id;
        if (!patientId) {
          continue;
        }
        const calculatedFee = Number(appointment.calculatedFee || 0);
        const chargedFee = Number(appointment.chargedFee ?? 0);
        const debt = calculatedFee - chargedFee;
        debtMap[patientId] = (debtMap[patientId] || 0) + debt;
      }
    }

    const myDentistId = Number(localStorage.getItem('dentistId')) || 0;
    const treatmentMap: Record<number, number> = {};
    for (const toothTreatment of toothTreatments as ToothTreatment[]) {
      const patientId = Number(toothTreatment.patient);
      if (!Number.isFinite(patientId) || patientId <= 0) {
        continue;
      }
      if (isDentist && myDentistId > 0) {
        const did = toothTreatment.dentist?.id;
        if (did == null || did !== myDentistId) {
          continue;
        }
      }
      treatmentMap[patientId] = (treatmentMap[patientId] || 0) + 1;
    }

    setDebtByPatient(debtMap);
    setTreatmentCountsByPatient(treatmentMap);
  };

  const fetchPatients = async (searchFilters?: PatientFilters) => {
    setIsLoading(true);
    setError('');
    try {
      const [data] = await Promise.all([
        patientService.getAll(searchFilters),
        usePatientsPortalShell ? fetchPortalPatientAggregates() : Promise.resolve(),
      ]);
      setPatients(data);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
      setError(err.response?.data?.message || t('fetchPatientsError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPatients();
  }, [role]);

  useEffect(() => {
    if (!isDentist) {
      setDentistPortalDisplayName('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      const raw = localStorage.getItem('dentistId');
      const id = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isFinite(id) || id <= 0) return;
      try {
        const profile = await dentistService.getById(id);
        const label = `${profile?.staff?.name ?? ''} ${profile?.staff?.surname ?? ''}`.trim();
        if (!cancelled) setDentistPortalDisplayName(label || t('dentistNumber', { id }));
      } catch {
        if (!cancelled) setDentistPortalDisplayName('');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isDentist, i18n.language, t]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchFilters: PatientFilters = {};
    if (filters.name) searchFilters.name = filters.name;
    if (filters.surname) searchFilters.surname = filters.surname;
    if (filters.birthdate) searchFilters.birthdate = filters.birthdate;
    void fetchPatients(searchFilters);
  };

  const handleClearSearch = () => {
    setFilters({ name: '', surname: '', birthdate: '' });
    void fetchPatients();
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await patientService.create(newPatient);
      setShowAddModal(false);
      setNewPatient({ name: '', surname: '', birthDate: '' });
      void fetchPatients();
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      setError(err.response?.data?.message || t('createPatientError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBirthDate = (dateValue: string) => {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return dateValue;
    }
    return formatDateDdMmYyyy(parsed);
  };

  const formatDebt = (debt: number) =>
    new Intl.NumberFormat(appLocaleTag(i18n.language), {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(debt);

  const portalRows: PortalPatientRow[] = useMemo(
    () =>
      patients.map((patient) => ({
        ...patient,
        treatmentCount: treatmentCountsByPatient[patient.id] || 0,
        totalDebt: debtByPatient[patient.id] || 0,
      })),
    [debtByPatient, patients, treatmentCountsByPatient],
  );

  const totalPages = Math.max(1, Math.ceil(portalRows.length / DIRECTOR_PAGE_SIZE));
  const paginatedPortalRows = useMemo(() => {
    const startIndex = (currentPage - 1) * DIRECTOR_PAGE_SIZE;
    return portalRows.slice(startIndex, startIndex + DIRECTOR_PAGE_SIZE);
  }, [currentPage, portalRows]);

  if (usePatientsPortalShell) {
    return (
      <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Clinic Management"
          portalBadge={isDirector ? undefined : isReception ? 'Reception Portal' : 'Dentist Portal'}
          userDisplayName={isDentist ? dentistPortalDisplayName : ''}
          userSubtitle={isDirector ? 'Clinic Director' : isReception ? 'Receptionist' : 'Dentist'}
          menuItems={isDirector ? DIRECTOR_PORTAL_MENU : isReception ? FRONTDESK_PORTAL_MENU : DENTIST_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          showProfileStrip={isDentist}
          headerActions={
            isDirectorOrReception || isDentist ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-md bg-[#0066A6] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#00588f]"
            >
              {t('registerNewPatient')}
            </button>
            ) : null
          }
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-slate-900">{t('portalDirectoryTitle')}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {t('portalSubtitle', { count: patients.length })}
                {isDentist ? t('portalSubtitleDentistExtra') : ''}
              </p>
            </div>

            <form onSubmit={handleSearch} className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <input
                  type="text"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={t('placeholderFirstName')}
                />
                <input
                  type="text"
                  value={filters.surname}
                  onChange={(e) => setFilters({ ...filters, surname: e.target.value })}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={t('placeholderSurname')}
                />
                <input
                  type="date"
                  value={filters.birthdate}
                  onChange={(e) => setFilters({ ...filters, birthdate: e.target.value })}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00588f] disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                    {t('search')}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {t('clear')}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
              <table className="w-full table-fixed">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">{t('tablePatientName')}</th>
                    <th className="px-4 py-3 text-left">{t('table.surname')}</th>
                    <th className="px-4 py-3 text-left">{t('table.birthDate')}</th>
                    <th className="px-4 py-3 text-left">{t('tableContact')}</th>
                    <th className="px-4 py-3 text-left">{isDentist ? t('yourTreatments') : t('tableTreatments')}</th>
                    {isDirectorOrReception || isDentist ? <th className="px-4 py-3 text-left">{t('tableDebtStatus')}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={isDirectorOrReception || isDentist ? 6 : 5} className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('loading')}
                      </td>
                    </tr>
                  ) : paginatedPortalRows.length === 0 ? (
                    <tr>
                      <td colSpan={isDirectorOrReception || isDentist ? 6 : 5} className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('empty')}
                      </td>
                    </tr>
                  ) : (
                    paginatedPortalRows.map((patient) => (
                      <tr
                        key={patient.id}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-semibold text-[#0066A6]">{patient.name}</td>
                        <td className="px-4 py-3">{patient.surname}</td>
                        <td className="px-4 py-3">{formatBirthDate(patient.birthDate)}</td>
                        <td className="px-4 py-3 text-slate-400">-</td>
                        <td className="px-4 py-3">{patient.treatmentCount}</td>
                        {isDirectorOrReception || isDentist ? (
                        <td
                          className={`px-4 py-3 font-semibold ${
                            patient.totalDebt > 0 ? 'text-red-600' : 'text-slate-400'
                          }`}
                        >
                          {formatDebt(patient.totalDebt)}
                        </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>
                {t('showingRecords', { shown: paginatedPortalRows.length, total: portalRows.length })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="rounded border border-slate-200 px-2 py-1 text-slate-500 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded px-3 py-1 text-xs font-semibold ${
                      currentPage === page
                        ? 'bg-[#0066A6] text-white'
                        : 'border border-slate-200 text-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="rounded border border-slate-200 px-2 py-1 text-slate-500 disabled:opacity-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </main>
        </ClinicPortalShell>

        {(isDirectorOrReception || isDentist) && showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('addTitle')}</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div>
                  <label htmlFor="newNameDirector" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('form.name')}
                  </label>
                  <input
                    type="text"
                    id="newNameDirector"
                    required
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={t('form.namePlaceholder')}
                  />
                </div>
                <div>
                  <label htmlFor="newSurnameDirector" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('form.surname')}
                  </label>
                  <input
                    type="text"
                    id="newSurnameDirector"
                    required
                    value={newPatient.surname}
                    onChange={(e) => setNewPatient({ ...newPatient, surname: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={t('form.surnamePlaceholder')}
                  />
                </div>
                <div>
                  <label htmlFor="newBirthDateDirector" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('form.birthDate')}
                  </label>
                  <input
                    type="date"
                    id="newBirthDateDirector"
                    required
                    value={newPatient.birthDate}
                    onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-teal-500 py-2 font-medium text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
                  >
                    {isSubmitting ? t('adding') : t('add')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-lg bg-gray-200 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
    <div className="flex h-dvh items-center justify-center bg-[#f4f6f8] text-slate-700">
      <p className="text-lg">{tCommon('noPermissionPage')}</p>
    </div>
  );
};

export default Patients;

