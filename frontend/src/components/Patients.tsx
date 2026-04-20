import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';
import { appointmentService, patientService, toothTreatmentService } from '../services/api';
import type { Patient, PatientFilters, CreatePatientDto, ToothTreatment } from '../services/api';
import { useTranslation } from 'react-i18next';

type DirectorPatientRow = Patient & {
  treatmentCount: number;
  totalDebt: number;
};

const DIRECTOR_PAGE_SIZE = 7;

const Patients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('patients');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
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
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };
    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);

  const fetchDirectorAggregates = async () => {
    const [appointmentsData, toothTreatments] = await Promise.all([
      appointmentService.getAll(),
      toothTreatmentService.getAll(),
    ]);

    const debtMap: Record<number, number> = {};
    for (const appointment of appointmentsData.appointments) {
      const patientId = appointment.patient?.id;
      if (!patientId) {
        continue;
      }
      const calculatedFee = Number(appointment.calculatedFee || 0);
      const chargedFee = Number(appointment.chargedFee || 0);
      const debt = calculatedFee - chargedFee;
      debtMap[patientId] = (debtMap[patientId] || 0) + debt;
    }

    const treatmentMap: Record<number, number> = {};
    for (const toothTreatment of toothTreatments as ToothTreatment[]) {
      const patientId = Number(toothTreatment.patient);
      if (!Number.isFinite(patientId) || patientId <= 0) {
        continue;
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
        role === 'director' ? fetchDirectorAggregates() : Promise.resolve(),
      ]);
      setPatients(data);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
      setError(err.response?.data?.message || 'Failed to fetch patients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPatients();
  }, [role]);

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
      setError(err.response?.data?.message || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBirthDate = (dateValue: string) => {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return dateValue;
    }
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatDebt = (debt: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(debt);

  const directorRows: DirectorPatientRow[] = useMemo(
    () =>
      patients.map((patient) => ({
        ...patient,
        treatmentCount: treatmentCountsByPatient[patient.id] || 0,
        totalDebt: debtByPatient[patient.id] || 0,
      })),
    [debtByPatient, patients, treatmentCountsByPatient],
  );

  const totalPages = Math.max(1, Math.ceil(directorRows.length / DIRECTOR_PAGE_SIZE));
  const paginatedDirectorRows = useMemo(() => {
    const startIndex = (currentPage - 1) * DIRECTOR_PAGE_SIZE;
    return directorRows.slice(startIndex, startIndex + DIRECTOR_PAGE_SIZE);
  }, [currentPage, directorRows]);

  if (role === 'director') {
    return (
      <>
      <div className="min-h-screen bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Clinic Management"
          userDisplayName=""
          userSubtitle="Clinic Director"
          menuItems={DIRECTOR_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          showProfileStrip={false}
          headerActions={
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-md bg-[#0066A6] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#00588f]"
            >
              + Register New Patient
            </button>
          }
        >
          <main className="h-[calc(100vh-4rem)] flex-1 overflow-auto bg-[#f9fafb] px-6 py-6">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-slate-900">Patient Directory</h1>
              <p className="mt-2 text-sm text-slate-500">
                {patients.length.toLocaleString('en-US')} total registered patients
              </p>
            </div>

            <form onSubmit={handleSearch} className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <input
                  type="text"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="First name"
                />
                <input
                  type="text"
                  value={filters.surname}
                  onChange={(e) => setFilters({ ...filters, surname: e.target.value })}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Surname"
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
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear
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
                    <th className="px-4 py-3 text-left">Patient Name</th>
                    <th className="px-4 py-3 text-left">Surname</th>
                    <th className="px-4 py-3 text-left">Birthdate</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Treatments</th>
                    <th className="px-4 py-3 text-left">Debt Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        Loading patients...
                      </td>
                    </tr>
                  ) : paginatedDirectorRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No patients found.
                      </td>
                    </tr>
                  ) : (
                    paginatedDirectorRows.map((patient) => (
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
                        <td
                          className={`px-4 py-3 font-semibold ${
                            patient.totalDebt > 0 ? 'text-red-600' : 'text-slate-400'
                          }`}
                        >
                          {formatDebt(patient.totalDebt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>
                Showing {paginatedDirectorRows.length} of {directorRows.length} records
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

        {showAddModal && (
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
    <div className="min-h-screen bg-blue-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="absolute top-4 right-4" ref={languageMenuRef}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-2 rounded-lg bg-white/90 hover:bg-white transition-colors shadow-sm"
            aria-label="Change language"
          >
            <Globe className="w-5 h-5 text-gray-700" />
          </button>
          {showLanguageMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[120px] z-50">
              <button onClick={() => { i18n.changeLanguage('en'); setShowLanguageMenu(false); }} className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${i18n.language === 'en' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'}`}>English</button>
              <button onClick={() => { i18n.changeLanguage('az'); setShowLanguageMenu(false); }} className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${i18n.language === 'az' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'}`}>Azərbaycan</button>
              <button onClick={() => { i18n.changeLanguage('ru'); setShowLanguageMenu(false); }} className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${i18n.language === 'ru' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'}`}>Русский</button>
            </div>
          )}
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('filters.name')}
                </label>
                <input
                  type="text"
                  id="name"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder={t('filters.namePlaceholder')}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="surname" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('filters.surname')}
                </label>
                <input
                  type="text"
                  id="surname"
                  value={filters.surname}
                  onChange={(e) => setFilters({ ...filters, surname: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder={t('filters.surnamePlaceholder')}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="birthdate" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('filters.birthDate')}
                </label>
                <input
                  type="date"
                  id="birthdate"
                  value={filters.birthdate}
                  onChange={(e) => setFilters({ ...filters, birthdate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-1 px-4 py-2 bg-teal-500 text-white text-sm rounded-md font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('search')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  {t('clear')}
                </button>
              </div>
            </div>
          </form>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider" style={{ width: '33.33%' }}>
                    {t('table.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider" style={{ width: '33.33%' }}>
                    {t('table.surname')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider" style={{ width: '33.33%' }}>
                    {t('table.birthDate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      {t('empty')}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="hover:bg-teal-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{patient.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{patient.surname}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{patient.birthDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>{t('addNew')}</span>
          </button>
        </div>
      </main>
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('addTitle')}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{t('formIntro')}</p>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  id="newName"
                  required
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={t('form.namePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="newSurname" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.surname')}
                </label>
                <input
                  type="text"
                  id="newSurname"
                  required
                  value={newPatient.surname}
                  onChange={(e) => setNewPatient({ ...newPatient, surname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={t('form.surnamePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="newBirthDate" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.birthDate')}
                </label>
                <input
                  type="date"
                  id="newBirthDate"
                  required
                  value={newPatient.birthDate}
                  onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('adding') : t('add')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;

