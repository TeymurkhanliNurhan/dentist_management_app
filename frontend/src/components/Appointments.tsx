import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Header from './Header';
import {
  appointmentService,
  patientService,
  paymentDetailsService,
  expenseService,
} from '../services/api';
import type {
  Appointment,
  AppointmentFilters,
  CreateAppointmentDto,
  Patient,
  CreatePatientDto,
  FinanceOverviewResponse,
  CreateExpenseDto,
  CreatePaymentDetailsDto,
} from '../services/api';
import { useTranslation } from 'react-i18next';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

const PAGE_SIZE = 10;

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function localDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDefaultPaymentDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

type AppointmentListMode = 'open' | 'past' | 'all';

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

const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('appointments');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const isDirector = role === 'director';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [directorDisplayName, setDirectorDisplayName] = useState('');
  const [financeOverview, setFinanceOverview] = useState<FinanceOverviewResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [expandedPaymentDetails, setExpandedPaymentDetails] = useState<Set<number>>(new Set());
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [financeSubmitError, setFinanceSubmitError] = useState<string | null>(null);
  const [isCreatingExpenseWithPayment, setIsCreatingExpenseWithPayment] = useState(false);
  const [newExpense, setNewExpense] = useState<CreateExpenseDto>({
    name: '',
    description: '',
    fixedCost: undefined,
    dayOfMonth: undefined,
  });
  const [newPaymentDetail, setNewPaymentDetail] = useState<CreatePaymentDetailsDto>({
    date: buildDefaultPaymentDate(new Date().getFullYear(), new Date().getMonth() + 1),
    cost: 0,
  });
  const [rawAppointments, setRawAppointments] = useState<Appointment[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listMode, setListMode] = useState<AppointmentListMode>('open');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filters, setFilters] = useState<AppointmentFilters>({
    startDate: '',
    patientName: '',
    patientSurname: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState<CreateAppointmentDto>({
    startDate: '',
    endDate: '',
    chargedFee: 0,
    patient_id: 0,
  });
  const [patientSearch, setPatientSearch] = useState({ name: '', surname: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string>('');
  const [showAddPatientInModal, setShowAddPatientInModal] = useState(false);
  const [newPatient, setNewPatient] = useState<CreatePatientDto>({ name: '', surname: '', birthDate: '' });
  const [isSubmittingPatient, setIsSubmittingPatient] = useState(false);
  const [patientError, setPatientError] = useState<string>('');

  const FETCH_ERROR_KEY = '__appointments_fetch_error__';
  const CREATE_ERROR_KEY = '__appointments_create_error__';
  const DATE_ERROR_KEY = 'endDateError';

  const buildSearchFilters = (): AppointmentFilters => {
    const searchFilters: AppointmentFilters = {};
    if (filters.startDate) searchFilters.startDate = filters.startDate;
    if (filters.patientName) searchFilters.patientName = filters.patientName;
    if (filters.patientSurname) searchFilters.patientSurname = filters.patientSurname;
    return searchFilters;
  };

  const fetchAppointments = async (searchFilters?: AppointmentFilters, resetPage = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getAll({
        ...searchFilters,
      });
      setRawAppointments(data.appointments);
      if (resetPage) setListPage(1);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      setError(err.response?.data?.message || FETCH_ERROR_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAppointments = useMemo(
    () => filterAppointmentsByEnd(rawAppointments, listMode),
    [rawAppointments, listMode],
  );

  const totalFiltered = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const effectivePage = Math.min(listPage, totalPages);
  const displayedAppointments = filteredAppointments.slice(
    (effectivePage - 1) * PAGE_SIZE,
    effectivePage * PAGE_SIZE,
  );

  const fetchFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setFinanceLoading(true);
    setFinanceError(null);
    try {
      const data = await paymentDetailsService.getFinanceOverview({ year, month });
      setFinanceOverview(data);
    } catch (err: any) {
      setFinanceError(err?.response?.data?.message ?? 'Failed to fetch finance overview');
    } finally {
      setFinanceLoading(false);
    }
  };

  const togglePaymentDetailExpanded = (paymentDetailId: number) => {
    setExpandedPaymentDetails((prev) => {
      const next = new Set(prev);
      if (next.has(paymentDetailId)) {
        next.delete(paymentDetailId);
      } else {
        next.add(paymentDetailId);
      }
      return next;
    });
  };

  const resetFinanceCreateState = () => {
    setNewExpense({
      name: '',
      description: '',
      fixedCost: undefined,
      dayOfMonth: undefined,
    });
    setNewPaymentDetail({
      date: buildDefaultPaymentDate(selectedYear, selectedMonth),
      cost: 0,
    });
    setFinanceSubmitError(null);
  };

  const handleCreateExpenseAndPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinanceSubmitError(null);
    if (!newExpense.name.trim()) {
      setFinanceSubmitError('Expense name is required.');
      return;
    }
    if (!newPaymentDetail.date) {
      setFinanceSubmitError('Payment date is required.');
      return;
    }
    if (!Number.isFinite(newPaymentDetail.cost ?? NaN) || (newPaymentDetail.cost ?? 0) < 0) {
      setFinanceSubmitError('Payment cost must be a valid non-negative number.');
      return;
    }

    setIsCreatingExpenseWithPayment(true);
    try {
      const createdExpense = await expenseService.create({
        name: newExpense.name.trim(),
        description: newExpense.description?.trim() || undefined,
        fixedCost: newExpense.fixedCost,
        dayOfMonth: newExpense.dayOfMonth,
      });

      await paymentDetailsService.create({
        date: newPaymentDetail.date,
        cost: Number(newPaymentDetail.cost),
        expenseId: createdExpense.id,
      });

      setShowAddExpenseModal(false);
      resetFinanceCreateState();
      await fetchFinanceOverview(selectedYear, selectedMonth);
    } catch (err: any) {
      setFinanceSubmitError(
        err?.response?.data?.message ?? 'Failed to create expense and payment detail.',
      );
    } finally {
      setIsCreatingExpenseWithPayment(false);
    }
  };

  useEffect(() => {
    if (isDirector) return;
    fetchAppointments();
    const fetchPatients = async () => {
      try {
        const data = await patientService.getAll();
        setPatients(data);
      } catch (err: any) {
        console.error('Failed to fetch patients:', err);
      }
    };
    fetchPatients();
  }, [isDirector]);

  useEffect(() => {
    if (!isDirector) return;
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDirectorDisplayName(`${staffName} ${staffSurname}`.trim());
    void fetchFinanceOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector]);

  useEffect(() => {
    if (!isDirector) return;
    setNewPaymentDetail((prev) => ({
      ...prev,
      date: buildDefaultPaymentDate(selectedYear, selectedMonth),
    }));
  }, [isDirector, selectedMonth, selectedYear]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');
    setError(null);
    
    if (newAppointment.endDate && newAppointment.startDate && newAppointment.endDate < newAppointment.startDate) {
      setDateError(DATE_ERROR_KEY);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const appointmentData = {
        ...newAppointment,
        endDate: newAppointment.endDate || undefined, // Send undefined if empty, which will be null on backend
      };
      await appointmentService.create(appointmentData);
      setShowAddModal(false);
      setNewAppointment({ startDate: '', endDate: '', chargedFee: 0, patient_id: 0 });
      setPatientSearch({ name: '', surname: '' });
      setDateError('');
      fetchAppointments(buildSearchFilters(), true);
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setError(err.response?.data?.message || CREATE_ERROR_KEY);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError('');
    setIsSubmittingPatient(true);
    try {
      const createdPatient = await patientService.create(newPatient);
      setShowAddPatientInModal(false);
      setNewPatient({ name: '', surname: '', birthDate: '' });
      
      // Auto-select the newly created patient in the modal
      if (createdPatient && createdPatient.id) {
        setNewAppointment({ ...newAppointment, patient_id: createdPatient.id });
      }
      
      // Refresh patients list
      const updatedPatients = await patientService.getAll();
      setPatients(updatedPatients);
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      setPatientError(err.response?.data?.message || 'Failed to create patient');
    } finally {
      setIsSubmittingPatient(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments(buildSearchFilters(), true);
  };

  const handleClearSearch = () => {
    setFilters({ startDate: '', patientName: '', patientSurname: '' });
    fetchAppointments({}, true);
  };

  const filteredPatients = patients.filter((patient) => {
    const nameMatch = patientSearch.name === '' ||
      patient.name.toLowerCase().startsWith(patientSearch.name.toLowerCase());
    const surnameMatch = patientSearch.surname === '' ||
      patient.surname.toLowerCase().startsWith(patientSearch.surname.toLowerCase());
    return nameMatch && surnameMatch;
  });

  const handlePageChange = (newPage: number) => {
    setListPage(newPage);
  };

  const resolvedError = error === FETCH_ERROR_KEY
    ? t('fetchError')
    : error === CREATE_ERROR_KEY
      ? t('createError')
      : error;

  if (isDirector) {
    const totalOutcome = financeOverview?.outcome?.total ?? 0;
    const netProfit = (financeOverview?.monthlyIncome ?? 0) - totalOutcome;
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
              <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
                    <p className="text-sm text-slate-500">Monthly clinic finance snapshot</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Year</label>
                      <input
                        type="number"
                        min={2000}
                        max={3000}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Month</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-20 rounded-md border border-slate-300 px-2 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchFinanceOverview(selectedYear, selectedMonth)}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {financeError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {financeError}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">Monthly Income</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {financeLoading ? '...' : formatCurrency(financeOverview?.monthlyIncome ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">Debt</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {financeLoading ? '...' : formatCurrency(financeOverview?.debt ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">Net Profit</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                      {financeLoading ? '...' : formatCurrency(netProfit)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Income Breakdown</h2>
                    <p className="mt-1 text-sm text-slate-500">Income by dentists</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {(financeOverview?.incomeBreakdown?.byDentists ?? []).map((item) => (
                        <div key={item.staffId} className="flex justify-between">
                          <span className="text-slate-600">{item.name} {item.surname}</span>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      {(financeOverview?.incomeBreakdown?.byDentists ?? []).length === 0 ? (
                        <p className="text-slate-500">No dentist income records for this month.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Outcome Breakdown</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Salaries, medicine purchases and other payment details
                    </p>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total outcome</span>
                        <span className="font-semibold">
                          {formatCurrency(financeOverview?.outcome?.total ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Salaries</span>
                        <span className="font-medium">
                          {formatCurrency(financeOverview?.outcome?.totalSalaries ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Medicine purchases</span>
                        <span className="font-medium">
                          {formatCurrency(financeOverview?.outcome?.totalMedicinePurchases ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Other payment details</span>
                        <span className="font-medium">
                          {formatCurrency(financeOverview?.outcome?.totalOtherPaymentDetails ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Salary Details</h2>
                    <div className="mt-3 space-y-2 text-sm">
                      {(financeOverview?.outcome?.salaries ?? []).map((salary) => (
                        <div key={salary.staffId} className="rounded-md border border-slate-100 px-3 py-2">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-700">
                              {salary.name} {salary.surname}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(salary.amount)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {salary.role ?? 'staff'} | {salary.type === 'percentage'
                              ? `${salary.percentage ?? 0}% of ${formatCurrency(salary.treatmentCost ?? 0)}`
                              : 'fixed salary'}
                          </p>
                        </div>
                      ))}
                      {(financeOverview?.outcome?.salaries ?? []).length === 0 ? (
                        <p className="text-slate-500">No salary records for this month.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">Payment Details</h2>
                      <button
                        type="button"
                        onClick={() => {
                          resetFinanceCreateState();
                          setShowAddExpenseModal(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        <Plus size={14} />
                        Add Expense + Payment
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      {(financeOverview?.otherPaymentDetails?.items ?? []).map((item) => {
                        const isExpanded = expandedPaymentDetails.has(item.id);
                        const purchaseRows = item.purchaseMedicines ?? [];
                        return (
                          <div
                            key={item.id}
                            className="rounded-md border border-slate-200 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-800">
                                  {item.expenseName ?? 'Expense'} | {item.date}
                                </p>
                                <p className="text-xs text-slate-500">
                                  PaymentDetail #{item.id}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-900">
                                  -{formatCurrency(item.cost)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePaymentDetailExpanded(item.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {isExpanded ? 'Hide medicines' : 'Show medicines'}
                                </button>
                              </div>
                            </div>
                            {isExpanded ? (
                              <div className="mt-2 rounded-md bg-slate-50 p-2">
                                {purchaseRows.length === 0 ? (
                                  <p className="text-xs text-slate-500">
                                    No purchase_medicine rows linked to this PaymentDetail.
                                  </p>
                                ) : (
                                  purchaseRows.map((purchase) => (
                                    <div
                                      key={purchase.id}
                                      className="flex items-center justify-between border-b border-slate-200 py-1 text-xs last:border-b-0"
                                    >
                                      <span className="text-slate-700">
                                        {purchase.medicineName ?? '-'} | count: {purchase.count}
                                      </span>
                                      <span className="font-medium text-slate-900">
                                        {formatCurrency(purchase.totalPrice)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {(financeOverview?.otherPaymentDetails?.items ?? []).length === 0 ? (
                        <p className="text-slate-500">No payment details for this month.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </ClinicPortalShell>
        </div>
        {showAddExpenseModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Add Expense + PaymentDetail</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpenseModal(false);
                    setFinanceSubmitError(null);
                  }}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateExpenseAndPayment} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Expense name</label>
                  <input
                    type="text"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Description (optional)</label>
                  <textarea
                    value={newExpense.description ?? ''}
                    onChange={(e) =>
                      setNewExpense((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Fixed cost (optional)</label>
                    <input
                      type="number"
                      min={0}
                      value={newExpense.fixedCost ?? ''}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          fixedCost: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Day of month (optional)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newExpense.dayOfMonth ?? ''}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          dayOfMonth: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Payment date</label>
                    <input
                      type="date"
                      value={newPaymentDetail.date}
                      onChange={(e) =>
                        setNewPaymentDetail((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Payment cost</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={newPaymentDetail.cost ?? ''}
                      onChange={(e) =>
                        setNewPaymentDetail((prev) => ({
                          ...prev,
                          cost: e.target.value === '' ? 0 : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                {financeSubmitError ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                    {financeSubmitError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(false)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingExpenseWithPayment}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {isCreatingExpenseWithPayment ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('title')}</h1>

          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="startDate" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('filters.date')}
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="patientName" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('filters.name')}
                </label>
                <input
                  type="text"
                  id="patientName"
                  value={filters.patientName}
                  onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder={t('filters.namePlaceholder')}
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="patientSurname" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('filters.surname')}
                </label>
                <input
                  type="text"
                  id="patientSurname"
                  value={filters.patientSurname}
                  onChange={(e) => setFilters({ ...filters, patientSurname: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder={t('filters.surnamePlaceholder')}
                />
              </div>

              <div className="w-full sm:w-auto flex flex-col gap-2 items-stretch sm:items-end sm:ml-auto">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center sm:justify-start space-x-2 px-4 py-2.5 bg-teal-500 text-white text-sm rounded-md font-semibold hover:bg-teal-600 transition-colors shadow-sm w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  <span>{t('newAppointment')}</span>
                </button>
                <div className="flex gap-2 justify-end">
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
            </div>
          </form>

          <div className="flex flex-wrap gap-2 mb-4">
            {(['open', 'past', 'all'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setListMode(mode);
                  setListPage(1);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  listMode === mode
                    ? 'border-teal-600 text-teal-700 bg-teal-50'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {mode === 'open' ? t('openAppointments') : mode === 'past' ? t('pastAppointments') : t('allAppointments')}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {resolvedError}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    {t('table.date')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    {t('table.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    {t('table.surname')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    {t('table.calculatedFee')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    {t('table.chargedFee')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    {t('table.discountFee')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : displayedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {t('empty')}
                    </td>
                  </tr>
                ) : (
                  displayedAppointments.map((appointment) => (
                    <tr 
                      key={appointment.id} 
                      onClick={() => navigate(`/appointments/${appointment.id}`)}
                      className="hover:bg-teal-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {appointment.startDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {appointment.patient.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {appointment.patient.surname}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${appointment.calculatedFee.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {appointment.chargedFee !== null ? `$${appointment.chargedFee.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {appointment.discountFee !== null ? `$${appointment.discountFee.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {t('pagination.showing', {
                from: (effectivePage - 1) * PAGE_SIZE + 1,
                to: Math.min(effectivePage * PAGE_SIZE, totalFiltered),
                total: totalFiltered,
              })}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(effectivePage - 1)}
                disabled={effectivePage <= 1 || isLoading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('pagination.previous')}
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    const current = effectivePage;
                    return page === 1 || page === totalPages || (page >= current - 1 && page <= current + 1);
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 py-2 text-sm text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(page)}
                        disabled={isLoading}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          page === effectivePage
                            ? 'bg-teal-500 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => handlePageChange(effectivePage + 1)}
                disabled={effectivePage >= totalPages || isLoading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pagination.next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Add Appointment Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('modal.title')}</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setPatientSearch({ name: '', surname: '' });
                    setDateError('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('modal.patient')}
                  </label>
                  
                  <div className="space-y-2 mb-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label htmlFor="patientNameSearch" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('modal.patientName')}
                        </label>
                        <input
                          type="text"
                          id="patientNameSearch"
                          value={patientSearch.name}
                          onChange={(e) => setPatientSearch({ ...patientSearch, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder={t('modal.namePlaceholder')}
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="patientSurnameSearch" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('modal.patientSurname')}
                        </label>
                        <input
                          type="text"
                          id="patientSurnameSearch"
                          value={patientSearch.surname}
                          onChange={(e) => setPatientSearch({ ...patientSearch, surname: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder={t('modal.surnamePlaceholder')}
                        />
                      </div>
                    </div>
                  </div>

                  <select
                    id="patient"
                    required
                    value={newAppointment.patient_id}
                    onChange={(e) => setNewAppointment({ ...newAppointment, patient_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={0}>{t('modal.selectPlaceholder')}</option>
                    {filteredPatients.length === 0 ? (
                      <option disabled>{t('modal.noPatients')}</option>
                    ) : (
                      filteredPatients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name} {patient.surname}
                        </option>
                      ))
                    )}
                  </select>
                  {filteredPatients.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('modal.patientsFound', { count: filteredPatients.length })}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAddPatientInModal(true)}
                    className="w-full mt-3 flex items-center justify-center space-x-1 px-4 py-2 bg-blue-50 text-blue-600 text-sm rounded-md font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{t('newPatient')}</span>
                  </button>
                </div>

                {showAddPatientInModal && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">{t('newPatient')}</h3>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="modalNewPatientName" className="block text-xs font-medium text-gray-700 mb-1">{t('modal.patientName')}</label>
                        <input
                          id="modalNewPatientName"
                          type="text"
                          value={newPatient.name}
                          onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="modalNewPatientSurname" className="block text-xs font-medium text-gray-700 mb-1">{t('modal.patientSurname')}</label>
                        <input
                          id="modalNewPatientSurname"
                          type="text"
                          value={newPatient.surname}
                          onChange={(e) => setNewPatient({ ...newPatient, surname: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="modalNewPatientBirthDate" className="block text-xs font-medium text-gray-700 mb-1">{t('patientBirthDate')}</label>
                        <input
                          id="modalNewPatientBirthDate"
                          type="date"
                          value={newPatient.birthDate}
                          onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {patientError && (
                        <div className="text-xs text-red-600">{patientError}</div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddPatient}
                          disabled={isSubmittingPatient || !newPatient.name || !newPatient.surname || !newPatient.birthDate}
                          className="flex-1 py-2 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingPatient ? t('creating') : t('create')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddPatientInModal(false);
                            setNewPatient({ name: '', surname: '', birthDate: '' });
                            setPatientError('');
                          }}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="newStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('startDate')}
                  </label>
                  <input
                    type="date"
                    id="newStartDate"
                    required
                    value={newAppointment.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      setNewAppointment({ ...newAppointment, startDate });
                      if (newAppointment.endDate && startDate && newAppointment.endDate < startDate) {
                        setDateError(DATE_ERROR_KEY);
                      } else {
                        setDateError('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="newEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('endDate')}
                  </label>
                  <input
                    type="date"
                    id="newEndDate"
                    value={newAppointment.endDate}
                    onChange={(e) => {
                      const endDate = e.target.value;
                      setNewAppointment({ ...newAppointment, endDate });
                      if (endDate && newAppointment.startDate && endDate < newAppointment.startDate) {
                        setDateError(DATE_ERROR_KEY);
                      } else {
                        setDateError('');
                      }
                    }}
                    min={newAppointment.startDate || undefined}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      dateError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    }`}
                  />
                  {dateError && (
                    <p className="text-xs text-red-600 mt-1">{t(dateError)}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newChargedFee" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('chargedFee')}
                  </label>
                  <input
                    type="number"
                    id="newChargedFee"
                    min="0"
                    step="0.01"
                    value={newAppointment.chargedFee ?? ''}
                    onChange={(e) => setNewAppointment({ ...newAppointment, chargedFee: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={t('chargedPlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('calculatedHint')}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !!dateError}
                    className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t('creating') : t('create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setPatientSearch({ name: '', surname: '' });
                      setDateError('');
                    }}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Appointments;

