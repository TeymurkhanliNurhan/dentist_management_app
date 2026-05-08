import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ChevronDown, ChevronUp, Settings, Wallet } from 'lucide-react';
import {
  appointmentService,
  dentistService,
  paymentDetailsService,
  type Appointment,
  type DentistFinanceOverview,
  type FinanceOverviewResponse,
} from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type FinanceViewMode = 'monthly' | 'annual';

type AnnualPoint = {
  month: number;
  monthLabel: string;
  income: number;
  debt: number;
  outcome: number;
  profit: number;
};

function endOfMonthIso(year: number, month: number): string {
  const last = new Date(year, month, 0);
  const d = last.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const SingleDentistFinance = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [financeOverview, setFinanceOverview] = useState<FinanceOverviewResponse | null>(null);
  const [dentistFinance, setDentistFinance] = useState<DentistFinanceOverview | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<FinanceViewMode>('monthly');
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [dentistError, setDentistError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [dentistLoading, setDentistLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [annualOverview, setAnnualOverview] = useState<AnnualPoint[]>([]);
  const [showGraph, setShowGraph] = useState(false);
  const [visibleSeries, setVisibleSeries] = useState<{
    income: boolean;
    outcome: boolean;
    profit: boolean;
  }>({
    income: true,
    outcome: true,
    profit: true,
  });
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [expandedPaymentDetails, setExpandedPaymentDetails] = useState<Set<number>>(new Set());
  const [visibleRecentAppointmentCount, setVisibleRecentAppointmentCount] = useState(10);

  const fetchClinicFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setFinanceLoading(true);
    setFinanceError(null);
    try {
      const data = await paymentDetailsService.getFinanceOverview({ year, month });
      setFinanceOverview(data);
    } catch (err: any) {
      setFinanceError(err?.response?.data?.message ?? 'Failed to fetch clinic finance overview');
    } finally {
      setFinanceLoading(false);
    }
  };

  const fetchAnnualOverview = async (year = selectedYear) => {
    setAnnualLoading(true);
    setFinanceError(null);
    try {
      const monthRequests = Array.from({ length: 12 }, (_, i) =>
        paymentDetailsService.getFinanceOverview({ year, month: i + 1 }),
      );
      const monthlyData = await Promise.all(monthRequests);
      const annualRows = monthlyData.map((item, i) => {
        const outcome = Number(item?.outcome?.total ?? 0);
        const income = Number(item?.monthlyIncome ?? 0);
        return {
          month: i + 1,
          monthLabel: MONTH_LABELS[i],
          income,
          debt: Number(item?.debt ?? 0),
          outcome,
          profit: income - outcome,
        };
      });
      setAnnualOverview(annualRows);
    } catch (err: any) {
      setFinanceError(err?.response?.data?.message ?? 'Failed to fetch annual overview');
    } finally {
      setAnnualLoading(false);
    }
  };

  const fetchDentistFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setDentistLoading(true);
    setDentistError(null);
    try {
      const data = await dentistService.getFinanceOverview({ year, month });
      setDentistFinance(data);
    } catch (err: any) {
      setDentistError(err?.response?.data?.message ?? 'Failed to fetch dentist finance overview');
    } finally {
      setDentistLoading(false);
    }
  };

  const fetchMonthAppointments = async (year = selectedYear, month = selectedMonth) => {
    setAppointmentsLoading(true);
    setAppointmentsError(null);
    try {
      const startDateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const startDateTo = endOfMonthIso(year, month);
      const { appointments } = await appointmentService.getAll({
        startDateFrom,
        startDateTo,
        limit: 100,
        page: 1,
      });
      setRecentAppointments(appointments);
    } catch (err: any) {
      setAppointmentsError(err?.response?.data?.message ?? 'Failed to fetch appointments');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const toggleExpenseExpanded = (expenseKey: string) => {
    setExpandedExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(expenseKey)) next.delete(expenseKey);
      else next.add(expenseKey);
      return next;
    });
  };

  const togglePaymentDetailExpanded = (paymentDetailId: number) => {
    setExpandedPaymentDetails((prev) => {
      const next = new Set(prev);
      if (next.has(paymentDetailId)) next.delete(paymentDetailId);
      else next.add(paymentDetailId);
      return next;
    });
  };

  useEffect(() => {
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDisplayName(`${staffName} ${staffSurname}`.trim());
  }, []);

  useEffect(() => {
    void fetchAnnualOverview(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  useEffect(() => {
    if (viewMode === 'monthly') {
      void fetchClinicFinanceOverview(selectedYear, selectedMonth);
      void fetchDentistFinanceOverview(selectedYear, selectedMonth);
      void fetchMonthAppointments(selectedYear, selectedMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, viewMode]);

  const totalOutcome = financeOverview?.outcome?.total ?? 0;
  const netProfit = (financeOverview?.monthlyIncome ?? 0) - totalOutcome;
  const annualIncomeTotal = annualOverview.reduce((acc, item) => acc + item.income, 0);
  const annualProfitTotal = annualOverview.reduce((acc, item) => acc + item.profit, 0);
  const annualDebtTotal = annualOverview.reduce((acc, item) => acc + item.debt, 0);

  const chartWidth = 760;
  const chartHeight = 300;
  const chartPadding = { top: 24, right: 24, bottom: 42, left: 56 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartXForMonth = (month: number) =>
    chartPadding.left + ((month - 1) / 11) * plotWidth;

  const enabledMetricValues = annualOverview.flatMap((row) => {
    const values: number[] = [];
    if (visibleSeries.income) values.push(row.income);
    if (visibleSeries.outcome) values.push(row.outcome);
    if (visibleSeries.profit) values.push(row.profit);
    return values;
  });
  const chartMinRaw = enabledMetricValues.length > 0 ? Math.min(...enabledMetricValues) : 0;
  const chartMaxRaw = enabledMetricValues.length > 0 ? Math.max(...enabledMetricValues) : 0;
  const chartMax = Math.max(0, chartMaxRaw);
  const fallbackNegativeMin = chartMax > 0 ? -chartMax * 0.25 : -1;
  const chartMin = Math.min(chartMinRaw, fallbackNegativeMin);
  const chartRange = chartMax - chartMin || 1;
  const chartYForValue = (value: number) =>
    chartPadding.top + ((chartMax - value) / chartRange) * plotHeight;
  const xAxisY = chartYForValue(0);
  const chartTicks = Array.from({ length: 5 }, (_, i) => {
    const value = chartMax - (chartRange * i) / 4;
    return {
      value,
      y: chartYForValue(value),
      label: Number.isFinite(value) ? Math.round(value).toLocaleString() : '0',
    };
  });

  const seriesColor = {
    income: '#0f766e',
    outcome: '#b91c1c',
    profit: '#1d4ed8',
  };
  const buildSeriesPath = (metric: 'income' | 'outcome' | 'profit') =>
    annualOverview
      .map((point, index) => {
        const x = chartXForMonth(point.month);
        const y = chartYForValue(point[metric]);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const expenseGroups = (financeOverview?.otherPaymentDetails?.byCategory ?? []).map((category) => {
    const paymentDetails = (financeOverview?.otherPaymentDetails?.items ?? []).filter(
      (item) => item.expenseId === category.expenseId,
    );
    return {
      key: `${category.expenseId}-${category.name}`,
      expenseName: category.name,
      expenseId: category.expenseId,
      totalCost: Number(category.totalCost ?? 0),
      paymentDetails,
    };
  });

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="ClinicalPrecision"
          portalBadge="Dentist Portal"
          userDisplayName={displayName || '-'}
          userSubtitle="Single Dentist"
          menuItems={DENTIST_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          headerActions={
            <button
              type="button"
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          }
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
                  <p className="text-sm text-slate-500">
                    {viewMode === 'annual'
                      ? 'Clinic finance and your practice metrics'
                      : 'Monthly clinic snapshot and your activity'}
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Mode</label>
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as FinanceViewMode)}
                      className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
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
                  {viewMode === 'monthly' ? (
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
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode === 'annual') {
                        void fetchAnnualOverview(selectedYear);
                      } else {
                        void fetchClinicFinanceOverview(selectedYear, selectedMonth);
                        void fetchDentistFinanceOverview(selectedYear, selectedMonth);
                        void fetchMonthAppointments(selectedYear, selectedMonth);
                      }
                    }}
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
              {dentistError ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {dentistError}
                </div>
              ) : null}
              {appointmentsError ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {appointmentsError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    {viewMode === 'annual' ? 'Annual Income' : 'Monthly Income'}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {viewMode === 'annual'
                      ? annualLoading
                        ? '...'
                        : formatCurrency(annualIncomeTotal)
                      : financeLoading
                        ? '...'
                        : formatCurrency(financeOverview?.monthlyIncome ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    {viewMode === 'annual' ? 'Annual Debt' : 'Debt'}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {viewMode === 'annual'
                      ? annualLoading
                        ? '...'
                        : formatCurrency(annualDebtTotal)
                      : financeLoading
                        ? '...'
                        : formatCurrency(financeOverview?.debt ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    {viewMode === 'annual' ? 'Annual Profit' : 'Net Profit'}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {viewMode === 'annual'
                      ? annualLoading
                        ? '...'
                        : formatCurrency(annualProfitTotal)
                      : financeLoading
                        ? '...'
                        : formatCurrency(netProfit)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Financial Statistics</h2>
                    <p className="text-sm text-slate-500">
                      Monthly trend for income, outcome and profit in {selectedYear}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGraph((prev) => !prev)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {showGraph ? 'Close graph' : 'See graph'}
                  </button>
                </div>

                {showGraph ? (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.income}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, income: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.income }}>
                          Income
                        </span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.outcome}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, outcome: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.outcome }}>
                          Outcome
                        </span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.profit}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, profit: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.profit }}>
                          Profit
                        </span>
                      </label>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="h-[320px] min-w-[760px] w-full"
                        role="img"
                        aria-label="Financial statistics by month"
                      >
                        <line
                          x1={chartPadding.left}
                          y1={chartPadding.top}
                          x2={chartPadding.left}
                          y2={chartHeight - chartPadding.bottom}
                          stroke="#cbd5e1"
                        />
                        <line
                          x1={chartPadding.left}
                          y1={xAxisY}
                          x2={chartWidth - chartPadding.right}
                          y2={xAxisY}
                          stroke="#94a3b8"
                        />

                        {chartTicks.map((tick, index) => (
                          <g key={`tick-${index}`}>
                            <line
                              x1={chartPadding.left}
                              y1={tick.y}
                              x2={chartWidth - chartPadding.right}
                              y2={tick.y}
                              stroke="#e2e8f0"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={chartPadding.left - 8}
                              y={tick.y + 4}
                              textAnchor="end"
                              className="fill-slate-500 text-[10px]"
                            >
                              {tick.label}
                            </text>
                          </g>
                        ))}

                        {annualOverview.map((point) => (
                          <text
                            key={point.month}
                            x={chartXForMonth(point.month)}
                            y={chartHeight - chartPadding.bottom + 18}
                            textAnchor="middle"
                            className="fill-slate-500 text-[10px]"
                          >
                            {point.monthLabel}
                          </text>
                        ))}

                        {visibleSeries.income ? (
                          <path
                            d={buildSeriesPath('income')}
                            fill="none"
                            stroke={seriesColor.income}
                            strokeWidth={2.5}
                          />
                        ) : null}
                        {visibleSeries.outcome ? (
                          <path
                            d={buildSeriesPath('outcome')}
                            fill="none"
                            stroke={seriesColor.outcome}
                            strokeWidth={2.5}
                          />
                        ) : null}
                        {visibleSeries.profit ? (
                          <path
                            d={buildSeriesPath('profit')}
                            fill="none"
                            stroke={seriesColor.profit}
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </svg>
                    </div>
                  </>
                ) : null}
              </div>

              {viewMode === 'monthly' ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Activity size={16} className="text-slate-400" />
                        Treatments Operated
                      </div>
                      <p className="mt-3 text-4xl font-bold text-slate-900">
                        {dentistLoading ? '…' : (dentistFinance?.treatmentsOperated.total ?? 0)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs">
                        {(dentistFinance?.treatmentsOperated.breakdown ?? []).map((t, idx) => (
                          <div key={idx}>
                            <p className="font-medium uppercase tracking-wider text-slate-500">
                              {t.name}
                            </p>
                            <p className="text-sm font-bold text-sky-700">{t.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Wallet size={16} className="text-slate-400" />
                        Treatment Mix
                      </div>
                      <div className="mt-6 space-y-6">
                        {(dentistFinance?.treatmentMix ?? []).map((t, idx) => (
                          <div key={idx}>
                            <div className="mb-2 flex justify-between text-sm font-medium">
                              <span className="text-slate-700">{t.name}</span>
                              <span className="text-sky-700">{t.percentage.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-700"
                                style={{ width: `${t.percentage}%` }}
                              />
                            </div>
                            <div className="mt-1 text-right text-xs text-slate-500">
                              {formatCurrency(t.commission)} Comm.
                            </div>
                          </div>
                        ))}
                        {!dentistLoading && (dentistFinance?.treatmentMix ?? []).length === 0 ? (
                          <p className="py-4 text-center text-sm text-slate-500">
                            No treatments recorded.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Other payment details for {MONTH_LABELS[selectedMonth - 1]} {selectedYear}
                    </p>
                    <div className="mt-4 space-y-2 text-sm">
                      {expenseGroups.map((group) => {
                        const isExpenseExpanded = expandedExpenses.has(group.key);
                        return (
                          <div key={group.key} className="rounded-md border border-slate-200 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-slate-800">{group.expenseName}</p>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-900">
                                  -{formatCurrency(group.totalCost)}
                                </span>
                                {group.paymentDetails.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpenseExpanded(group.key)}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                  >
                                    {isExpenseExpanded ? (
                                      <ChevronUp size={14} />
                                    ) : (
                                      <ChevronDown size={14} />
                                    )}
                                    {isExpenseExpanded ? 'Hide payment details' : 'Show payment details'}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {isExpenseExpanded ? (
                              <div className="mt-2 rounded-md bg-slate-50 p-2">
                                {group.paymentDetails.map((paymentDetail) => {
                                  const isPaymentExpanded = expandedPaymentDetails.has(
                                    paymentDetail.id,
                                  );
                                  const purchaseRows = paymentDetail.purchaseMedicines ?? [];
                                  const validPurchaseRows = purchaseRows.filter(
                                    (purchase) =>
                                      purchase.id !== null &&
                                      purchase.id !== undefined &&
                                      ((purchase.medicineName ?? '').trim().length > 0 ||
                                        Number(purchase.count ?? 0) > 0 ||
                                        Number(purchase.totalPrice ?? 0) > 0),
                                  );
                                  const hasMedicines = validPurchaseRows.length > 0;
                                  return (
                                    <div
                                      key={paymentDetail.id}
                                      className="mb-2 rounded-md border border-slate-200 bg-white px-2 py-2 last:mb-0"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-slate-700">
                                          {paymentDetail.date} | {formatCurrency(paymentDetail.cost)}
                                        </p>
                                        {hasMedicines ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              togglePaymentDetailExpanded(paymentDetail.id)
                                            }
                                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                          >
                                            {isPaymentExpanded ? (
                                              <ChevronUp size={14} />
                                            ) : (
                                              <ChevronDown size={14} />
                                            )}
                                            {isPaymentExpanded ? 'Hide medicines' : 'Show medicines'}
                                          </button>
                                        ) : null}
                                      </div>
                                      {hasMedicines && isPaymentExpanded ? (
                                        <div className="mt-2 rounded-md bg-slate-50 p-2">
                                          {validPurchaseRows.map((purchase) => (
                                            <div
                                              key={purchase.id}
                                              className="flex items-center justify-between border-b border-slate-200 py-1 text-xs last:border-b-0"
                                            >
                                              <span className="text-slate-700">
                                                {purchase.medicineName ?? '-'} | number:{' '}
                                                {purchase.count}
                                              </span>
                                              <span className="font-medium text-slate-900">
                                                totalCost: {formatCurrency(purchase.totalPrice)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {financeLoading ? (
                        <p className="text-slate-500">Loading expenses…</p>
                      ) : expenseGroups.length === 0 ? (
                        <p className="text-slate-500">No expenses for this month.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-semibold text-slate-900">Recent Appointments</h2>
                      <p className="text-sm text-slate-500">
                        Appointments in {MONTH_LABELS[selectedMonth - 1]} {selectedYear} (your cases)
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-5 py-3 font-medium">Patient</th>
                            <th className="px-5 py-3 font-medium">Date</th>
                            <th className="px-5 py-3 font-medium">Treatments</th>
                            <th className="px-5 py-3 font-medium">Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {appointmentsLoading ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                                Loading appointments…
                              </td>
                            </tr>
                          ) : (
                            recentAppointments
                              .slice(0, visibleRecentAppointmentCount)
                              .map((apt) => (
                                <tr key={apt.id} className="hover:bg-slate-50/50">
                                  <td className="px-5 py-4 font-medium text-slate-900">
                                    {apt.patient.name} {apt.patient.surname}
                                  </td>
                                  <td className="px-5 py-4">
                                    {new Date(apt.startDate).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </td>
                                  <td className="px-5 py-4">{apt.treatmentCount ?? 0}</td>
                                  <td className="px-5 py-4 font-semibold text-sky-700">
                                    {formatCurrency(apt.calculatedFee)}
                                  </td>
                                </tr>
                              ))
                          )}
                          {!appointmentsLoading && recentAppointments.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                                No appointments in this month.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                    {recentAppointments.length > visibleRecentAppointmentCount ? (
                      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleRecentAppointmentCount((c) => c + 10)
                          }
                          className="text-sm font-medium text-sky-700 hover:text-sky-800"
                        >
                          View more
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
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
};

export default SingleDentistFinance;
