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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type FinanceViewMode = 'monthly' | 'annual';
type AnnualPoint = {
  month: number;
  monthLabel: string;
  income: number;
  debt: number;
  outcome: number;
  profit: number;
};

type GraphMode = 'daily' | 'weekly' | 'monthly';

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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [graphMode, setGraphMode] = useState<GraphMode>('daily');
  const [financeData, setFinanceData] = useState<DentistFinanceOverview | null>(null);
  const [clinicFinanceOverview, setClinicFinanceOverview] = useState<FinanceOverviewResponse | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [viewMode, setViewMode] = useState<FinanceViewMode>('monthly');
  const [loading, setLoading] = useState(false);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicError, setClinicError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [visibleRecentCount, setVisibleRecentCount] = useState(7);
  const [visibleAppointmentCount, setVisibleAppointmentCount] = useState(10);
  const [showGraph, setShowGraph] = useState(false);
  const [annualOverview, setAnnualOverview] = useState<AnnualPoint[]>([]);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [expandedPaymentDetails, setExpandedPaymentDetails] = useState<Set<number>>(new Set());
  const [visibleSeries, setVisibleSeries] = useState<{
    income: boolean;
    outcome: boolean;
    profit: boolean;
  }>({
    income: true,
    outcome: true,
    profit: true,
  });

  const fetchFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dentistService.getFinanceOverview({ year, month });
      setFinanceData(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch dentist finance overview'));
    } finally {
      setLoading(false);
    }
  };

  const fetchClinicOverview = async (year = selectedYear, month = selectedMonth) => {
    setClinicLoading(true);
    setClinicError(null);
    try {
      const data = await paymentDetailsService.getFinanceOverview({ year, month });
      setClinicFinanceOverview(data);
    } catch (err: unknown) {
      setClinicError(getErrorMessage(err, 'Failed to fetch clinic finance overview'));
    } finally {
      setClinicLoading(false);
    }
  };

  const fetchAnnualOverview = async (year = selectedYear) => {
    setAnnualLoading(true);
    setClinicError(null);
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
    } catch (err: unknown) {
      setClinicError(getErrorMessage(err, 'Failed to fetch annual clinic overview'));
    } finally {
      setAnnualLoading(false);
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
    } catch (err: unknown) {
      setAppointmentsError(getErrorMessage(err, 'Failed to fetch appointments'));
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDisplayName(`${staffName} ${staffSurname}`.trim());
  }, []);

  useEffect(() => {
    void fetchFinanceOverview(selectedYear, selectedMonth);
    void fetchMonthAppointments(selectedYear, selectedMonth);
    if (viewMode === 'annual') {
      void fetchAnnualOverview(selectedYear);
    } else {
      void fetchClinicOverview(selectedYear, selectedMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, viewMode]);

  const chartWidth = 760;
  const chartHeight = 300;
  const chartPadding = { top: 40, right: 24, bottom: 42, left: 56 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const todayIsoDay = ((new Date().getDay() + 6) % 7) + 1;

  let graphData: Array<{ label: string; value: number }> = [];
  if (financeData) {
    if (graphMode === 'daily') {
      graphData = Array.from({ length: 7 }, (_, i) => {
        const day = ((todayIsoDay + i) % 7) + 1;
        const record = financeData.graphs.daily.find((d) => d.day === day);
        return { label: DAY_LABELS[day - 1], value: record?.commission ?? 0 };
      });
    } else if (graphMode === 'weekly') {
      graphData = Array.from({ length: 5 }, (_, i) => {
        const week = i + 1;
        const record = financeData.graphs.weekly.find((w) => w.week === week);
        return { label: `Week ${week}`, value: record?.commission ?? 0 };
      });
    } else if (graphMode === 'monthly') {
      graphData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const record = financeData.graphs.monthly.find((m) => m.month === month);
        return { label: MONTH_LABELS[i], value: record?.commission ?? 0 };
      });
    }
  }

  const values = graphData.map((d) => d.value);
  const chartMaxRaw = values.length > 0 ? Math.max(...values) : 0;
  const chartMax = Math.max(10, chartMaxRaw * 1.2);
  const chartMin = 0;
  const chartRange = chartMax - chartMin;

  const chartXForIndex = (index: number) =>
    chartPadding.left +
    (graphData.length > 1 ? (index / (graphData.length - 1)) * plotWidth : plotWidth / 2);
  const chartYForValue = (value: number) =>
    chartPadding.top + ((chartMax - value) / chartRange) * plotHeight;
  const xAxisY = chartYForValue(0);

  const chartTicks = Array.from({ length: 5 }, (_, i) => {
    const value = chartMax - (chartRange * i) / 4;
    let label = '';
    if (value >= 1000) {
      label = `$${(value / 1000).toFixed(1)}k`;
    } else {
      label = `$${Math.round(value)}`;
    }
    return {
      value,
      y: chartYForValue(value),
      label: Number.isFinite(value) ? label : '0',
    };
  });

  const seriesPath = graphData
    .map((point, index) => {
      const x = chartXForIndex(index);
      const y = chartYForValue(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const totalOutcome = clinicFinanceOverview?.outcome?.total ?? 0;
  const netProfit = (clinicFinanceOverview?.monthlyIncome ?? 0) - totalOutcome;
  const annualIncomeTotal = annualOverview.reduce((acc, item) => acc + item.income, 0);
  const annualProfitTotal = annualOverview.reduce((acc, item) => acc + item.profit, 0);
  const annualDebtTotal = annualOverview.reduce((acc, item) => acc + item.debt, 0);

  const annualChartWidth = 760;
  const annualChartHeight = 300;
  const annualChartPadding = { top: 24, right: 24, bottom: 42, left: 56 };
  const annualPlotWidth = annualChartWidth - annualChartPadding.left - annualChartPadding.right;
  const annualPlotHeight = annualChartHeight - annualChartPadding.top - annualChartPadding.bottom;
  const chartXForMonth = (month: number) =>
    annualChartPadding.left + ((month - 1) / 11) * annualPlotWidth;
  const seriesColor = {
    income: '#0f766e',
    outcome: '#b91c1c',
    profit: '#1d4ed8',
  };
  const enabledMetricValues = annualOverview.flatMap((row) => {
    const values: number[] = [];
    if (visibleSeries.income) values.push(row.income);
    if (visibleSeries.outcome) values.push(row.outcome);
    if (visibleSeries.profit) values.push(row.profit);
    return values;
  });
  const annualMinRaw = enabledMetricValues.length > 0 ? Math.min(...enabledMetricValues) : 0;
  const annualMaxRaw = enabledMetricValues.length > 0 ? Math.max(...enabledMetricValues) : 0;
  const annualMax = Math.max(0, annualMaxRaw);
  const fallbackNegativeMin = annualMax > 0 ? -annualMax * 0.25 : -1;
  const annualMin = Math.min(annualMinRaw, fallbackNegativeMin);
  const annualRange = annualMax - annualMin || 1;
  const annualYForValue = (value: number) =>
    annualChartPadding.top + ((annualMax - value) / annualRange) * annualPlotHeight;
  const annualXAxisY = annualYForValue(0);
  const annualTicks = Array.from({ length: 5 }, (_, i) => {
    const value = annualMax - (annualRange * i) / 4;
    return {
      y: annualYForValue(value),
      label: Number.isFinite(value) ? Math.round(value).toLocaleString() : '0',
    };
  });
  const buildSeriesPath = (metric: 'income' | 'outcome' | 'profit') =>
    annualOverview
      .map((point, index) => {
        const x = chartXForMonth(point.month);
        const y = annualYForValue(point[metric]);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  const expenseGroups = (clinicFinanceOverview?.otherPaymentDetails?.byCategory ?? []).map((category) => {
    const paymentDetails = (clinicFinanceOverview?.otherPaymentDetails?.items ?? []).filter(
      (item) => item.expenseId === category.expenseId,
    );
    return {
      key: `${category.expenseId}-${category.name}`,
      expenseName: category.name,
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
                    {MONTH_LABELS[selectedMonth - 1]} {selectedYear} — your practice metrics
                  </p>
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
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                    >
                      {MONTH_LABELS.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void fetchFinanceOverview(selectedYear, selectedMonth);
                      void fetchMonthAppointments(selectedYear, selectedMonth);
                    }}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              {clinicError ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {clinicError}
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
                      : clinicLoading
                        ? '...'
                        : formatCurrency(clinicFinanceOverview?.monthlyIncome ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">{viewMode === 'annual' ? 'Annual Debt' : 'Debt'}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {viewMode === 'annual'
                      ? annualLoading
                        ? '...'
                        : formatCurrency(annualDebtTotal)
                      : clinicLoading
                        ? '...'
                        : formatCurrency(clinicFinanceOverview?.debt ?? 0)}
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
                      : clinicLoading
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
                  <div className="flex items-center gap-2">
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as FinanceViewMode)}
                      className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowGraph((prev) => !prev)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {showGraph ? 'Close graph' : 'See graph'}
                    </button>
                  </div>
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
                        <span className="font-medium" style={{ color: seriesColor.income }}>Income</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.outcome}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, outcome: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.outcome }}>Outcome</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.profit}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, profit: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.profit }}>Profit</span>
                      </label>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${annualChartWidth} ${annualChartHeight}`}
                        className="h-[320px] min-w-[760px] w-full"
                        role="img"
                        aria-label="Financial statistics by month"
                      >
                        <line
                          x1={annualChartPadding.left}
                          y1={annualChartPadding.top}
                          x2={annualChartPadding.left}
                          y2={annualChartHeight - annualChartPadding.bottom}
                          stroke="#cbd5e1"
                        />
                        <line
                          x1={annualChartPadding.left}
                          y1={annualXAxisY}
                          x2={annualChartWidth - annualChartPadding.right}
                          y2={annualXAxisY}
                          stroke="#94a3b8"
                        />
                        {annualTicks.map((tick, index) => (
                          <g key={`annual-tick-${index}`}>
                            <line
                              x1={annualChartPadding.left}
                              y1={tick.y}
                              x2={annualChartWidth - annualChartPadding.right}
                              y2={tick.y}
                              stroke="#e2e8f0"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={annualChartPadding.left - 8}
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
                            y={annualChartHeight - annualChartPadding.bottom + 18}
                            textAnchor="middle"
                            className="fill-slate-500 text-[10px]"
                          >
                            {point.monthLabel}
                          </text>
                        ))}
                        {visibleSeries.income ? (
                          <path d={buildSeriesPath('income')} fill="none" stroke={seriesColor.income} strokeWidth={2.5} />
                        ) : null}
                        {visibleSeries.outcome ? (
                          <path d={buildSeriesPath('outcome')} fill="none" stroke={seriesColor.outcome} strokeWidth={2.5} />
                        ) : null}
                        {visibleSeries.profit ? (
                          <path d={buildSeriesPath('profit')} fill="none" stroke={seriesColor.profit} strokeWidth={2.5} />
                        ) : null}
                      </svg>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Expenses</h2>
                <div className="space-y-2 text-sm">
                  {expenseGroups.map((group) => {
                    const isExpenseExpanded = expandedExpenses.has(group.key);
                    return (
                      <div key={group.key} className="rounded-md border border-slate-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800">{group.expenseName}</p>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">-{formatCurrency(group.totalCost)}</span>
                            {group.paymentDetails.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpenseExpanded(group.key)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                {isExpenseExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isExpenseExpanded ? 'Hide payment details' : 'Show payment details'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {isExpenseExpanded ? (
                          <div className="mt-2 rounded-md bg-slate-50 p-2">
                            {group.paymentDetails.map((paymentDetail) => {
                              const isPaymentExpanded = expandedPaymentDetails.has(paymentDetail.id);
                              const hasMedicines = (paymentDetail.purchaseMedicines ?? []).length > 0;
                              return (
                                <div key={paymentDetail.id} className="mb-2 rounded-md border border-slate-200 bg-white px-2 py-2 last:mb-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-slate-700">
                                      {paymentDetail.date} | {formatCurrency(paymentDetail.cost)}
                                    </p>
                                    {hasMedicines ? (
                                      <button
                                        type="button"
                                        onClick={() => togglePaymentDetailExpanded(paymentDetail.id)}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                      >
                                        {isPaymentExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {isPaymentExpanded ? 'Hide medicines' : 'Show medicines'}
                                      </button>
                                    ) : null}
                                  </div>
                                  {hasMedicines && isPaymentExpanded ? (
                                    <div className="mt-2 rounded-md bg-slate-50 p-2">
                                      {(paymentDetail.purchaseMedicines ?? []).map((purchase) => (
                                        <div
                                          key={purchase.id}
                                          className="flex items-center justify-between border-b border-slate-200 py-1 text-xs last:border-b-0"
                                        >
                                          <span className="text-slate-700">
                                            {purchase.medicineName ?? '-'} | number: {purchase.count}
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
                  {expenseGroups.length === 0 ? <p className="text-slate-500">No expenses for this month.</p> : null}
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-slate-500">Loading finance data...</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Wallet size={16} className="text-slate-400" />
                        Monthly Commission ({financeData?.commissionRate ?? 0}%)
                      </div>
                      <p className="mt-3 text-4xl font-bold text-sky-700">
                        {formatCurrency(financeData?.monthlyCommission ?? 0)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Activity size={16} className="text-slate-400" />
                        Treatments Operated
                      </div>
                      <p className="mt-3 text-4xl font-bold text-slate-900">
                        {financeData?.treatmentsOperated.total ?? 0}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs">
                        {(financeData?.treatmentsOperated.breakdown ?? []).map((t, idx) => (
                          <div key={idx}>
                            <p className="font-medium uppercase tracking-wider text-slate-500">
                              {t.name}
                            </p>
                            <p className="text-sm font-bold text-sky-700">{t.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">Income Trends</h2>
                        <div className="flex rounded-md bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => setGraphMode('daily')}
                            className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Daily
                          </button>
                          <button
                            type="button"
                            onClick={() => setGraphMode('weekly')}
                            className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Weekly
                          </button>
                          <button
                            type="button"
                            onClick={() => setGraphMode('monthly')}
                            className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Monthly
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 w-full">
                        <svg
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="h-auto w-full"
                          role="img"
                          aria-label="Income trends graph"
                        >
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

                          {graphData.map((point, index) => (
                            <text
                              key={index}
                              x={chartXForIndex(index)}
                              y={chartHeight - chartPadding.bottom + 18}
                              textAnchor="middle"
                              className="fill-slate-500 text-[10px]"
                            >
                              {point.label}
                            </text>
                          ))}

                          <path
                            d={seriesPath}
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {graphData.map((point, index) => {
                            const cx = chartXForIndex(index);
                            const cy = chartYForValue(point.value);
                            const isHovered = hoveredNode === index;
                            return (
                              <g key={`dot-group-${index}`}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isHovered ? 6 : 4}
                                  fill="white"
                                  stroke="#0ea5e9"
                                  strokeWidth={isHovered ? 3 : 2}
                                  className="cursor-pointer transition-all duration-200"
                                  onMouseEnter={() => setHoveredNode(index)}
                                  onMouseLeave={() => setHoveredNode(null)}
                                />
                                {isHovered ? (
                                  <g>
                                    <rect
                                      x={cx - 35}
                                      y={cy - 34}
                                      width={70}
                                      height={24}
                                      rx={4}
                                      fill="#1e293b"
                                      className="pointer-events-none"
                                    />
                                    <text
                                      x={cx}
                                      y={cy - 17}
                                      textAnchor="middle"
                                      className="pointer-events-none fill-white text-[11px] font-medium"
                                    >
                                      {formatCurrency(point.value)}
                                    </text>
                                  </g>
                                ) : null}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <h2 className="text-lg font-semibold text-slate-900">Treatment Mix</h2>
                      <div className="mt-6 space-y-6">
                        {(financeData?.treatmentMix ?? []).map((t, idx) => (
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
                        {(financeData?.treatmentMix ?? []).length === 0 ? (
                          <p className="py-4 text-center text-sm text-slate-500">
                            No treatments recorded.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-semibold text-slate-900">
                        Recent Operated Treatments
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-5 py-3 font-medium">Patient</th>
                            <th className="px-5 py-3 font-medium">Treatment</th>
                            <th className="px-5 py-3 font-medium">Date</th>
                            <th className="px-5 py-3 font-medium">
                              Commission ({financeData?.commissionRate ?? 0}%)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(financeData?.recentOperatedTreatments ?? [])
                            .slice(0, visibleRecentCount)
                            .map((t, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                                      {t.patientInitials}
                                    </div>
                                    <span className="font-medium text-slate-900">{t.patientName}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    {t.treatmentList}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  {new Date(t.date).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </td>
                                <td className="px-5 py-4 font-bold text-sky-700">
                                  {formatCurrency(t.commission)}
                                </td>
                              </tr>
                            ))}
                          {(financeData?.recentOperatedTreatments ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                                No recent treatments found.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    {financeData && financeData.recentOperatedTreatments.length > 0 ? (
                      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
                        {visibleRecentCount < financeData.recentOperatedTreatments.length ? (
                          <button
                            type="button"
                            onClick={() => setVisibleRecentCount((prev) => prev + 10)}
                            className="text-sm font-medium text-sky-700 hover:text-sky-800"
                          >
                            View More
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="text-lg font-semibold text-slate-900">Recent Operations (Appointments)</h2>
                      <p className="text-sm text-slate-500">
                        Your appointments in {MONTH_LABELS[selectedMonth - 1]} {selectedYear}
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
                              .slice(0, visibleAppointmentCount)
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
                    {recentAppointments.length > visibleAppointmentCount ? (
                      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setVisibleAppointmentCount((c) => c + 10)}
                          className="text-sm font-medium text-sky-700 hover:text-sky-800"
                        >
                          View more
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
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
