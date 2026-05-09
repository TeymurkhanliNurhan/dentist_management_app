import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Settings, X } from 'lucide-react';
import {
  expenseService,
  paymentDetailsService,
  type CreateExpenseDto,
  type CreatePaymentDetailsDto,
  type FinanceOverviewResponse,
} from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { buildFinanceExpenseGroups } from '../lib/buildFinanceExpenseGroups';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { useTranslation } from 'react-i18next';
import { formatMonthLabelByIndex1 } from '../lib/localeHelpers';

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildDefaultPaymentDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

type FinanceViewMode = 'monthly' | 'annual';

type AnnualPoint = {
  month: number;
  monthLabel: string;
  income: number;
  debt: number;
  outcome: number;
  profit: number;
};

const DirectorFinance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('finance');
  const { t: tHeader } = useTranslation('header');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const isDirector = role === 'director';

  const monthShortLabel = (monthIndex1: number) =>
    formatMonthLabelByIndex1(monthIndex1, i18n.language, 'short');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [directorDisplayName, setDirectorDisplayName] = useState('');
  const [financeOverview, setFinanceOverview] = useState<FinanceOverviewResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<FinanceViewMode>('monthly');
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
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
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<{
    id: number | null;
    name: string;
  } | null>(null);
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

  const fetchFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setFinanceLoading(true);
    setFinanceError(null);
    try {
      const data = await paymentDetailsService.getFinanceOverview({ year, month });
      setFinanceOverview(data);
    } catch (err: any) {
      setFinanceError(err?.response?.data?.message ?? t('director.errFetchOverview'));
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
          monthLabel: monthShortLabel(i + 1),
          income,
          debt: Number(item?.debt ?? 0),
          outcome,
          profit: income - outcome,
        };
      });
      setAnnualOverview(annualRows);
    } catch (err: any) {
      setFinanceError(err?.response?.data?.message ?? t('director.errFetchAnnual'));
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
      setFinanceSubmitError(t('director.errExpenseName'));
      return;
    }
    if (!newPaymentDetail.date) {
      setFinanceSubmitError(t('director.errPaymentDate'));
      return;
    }
    if (!Number.isFinite(newPaymentDetail.cost ?? NaN) || (newPaymentDetail.cost ?? 0) < 0) {
      setFinanceSubmitError(t('director.errPaymentCost'));
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
        err?.response?.data?.message ?? t('director.errCreateExpensePayment'),
      );
    } finally {
      setIsCreatingExpenseWithPayment(false);
    }
  };

  const handleCreatePaymentForExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinanceSubmitError(null);

    if (selectedExpenseForPayment?.id == null) {
      setFinanceSubmitError(t('director.errSelectExpense'));
      return;
    }
    if (!newPaymentDetail.date) {
      setFinanceSubmitError(t('director.errPaymentDate'));
      return;
    }
    if (!Number.isFinite(newPaymentDetail.cost ?? NaN) || (newPaymentDetail.cost ?? 0) < 0) {
      setFinanceSubmitError(t('director.errPaymentCost'));
      return;
    }

    setIsCreatingExpenseWithPayment(true);
    try {
      await paymentDetailsService.create({
        date: newPaymentDetail.date,
        cost: Number(newPaymentDetail.cost),
        expenseId: selectedExpenseForPayment.id,
      });
      setShowAddPaymentModal(false);
      setSelectedExpenseForPayment(null);
      setFinanceSubmitError(null);
      setNewPaymentDetail({
        date: buildDefaultPaymentDate(selectedYear, selectedMonth),
        cost: 0,
      });
      await fetchFinanceOverview(selectedYear, selectedMonth);
    } catch (err: any) {
      setFinanceSubmitError(err?.response?.data?.message ?? t('director.errCreatePayment'));
    } finally {
      setIsCreatingExpenseWithPayment(false);
    }
  };

  useEffect(() => {
    if (!isDirector) {
      navigate('/course-of-treatments');
      return;
    }
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDirectorDisplayName(`${staffName} ${staffSurname}`.trim());
    void fetchFinanceOverview();
    void fetchAnnualOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector, navigate]);

  useEffect(() => {
    if (!isDirector) return;
    setNewPaymentDetail((prev) => ({
      ...prev,
      date: buildDefaultPaymentDate(selectedYear, selectedMonth),
    }));
  }, [isDirector, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!isDirector) return;
    void fetchAnnualOverview(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector, selectedYear]);

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
  // Keep a negative range under the X-axis even when all series are non-negative.
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
  const expenseGroups = buildFinanceExpenseGroups(financeOverview);

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle={tHeader('brandPrecisionDental')}
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
              aria-label={t('director.staffAria')}
            >
              <Settings size={16} />
            </button>
          }
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{t('director.title')}</h1>
                  <p className="text-sm text-slate-500">
                    {viewMode === 'annual'
                      ? t('director.subtitleAnnual')
                      : t('director.subtitleMonthly')}
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">{t('shared.mode')}</label>
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as FinanceViewMode)}
                      className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="monthly">{t('shared.monthly')}</option>
                      <option value="annual">{t('shared.annual')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">{t('shared.year')}</label>
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
                      <label className="mb-1 block text-xs text-slate-500">{t('shared.month')}</label>
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
                        void fetchFinanceOverview(selectedYear, selectedMonth);
                      }
                    }}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    {t('shared.refresh')}
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
                  <p className="text-sm text-slate-500">
                    {viewMode === 'annual' ? t('director.annualIncome') : t('director.monthlyIncome')}
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
                    {viewMode === 'annual' ? t('director.annualDebt') : t('director.debt')}
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
                    {viewMode === 'annual' ? t('director.annualProfit') : t('director.netProfit')}
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
                    <h2 className="text-lg font-semibold text-slate-900">{t('director.statsTitle')}</h2>
                    <p className="text-sm text-slate-500">
                      {t('director.statsSubtitle', { year: selectedYear })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGraph((prev) => !prev)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {showGraph ? t('director.closeGraph') : t('director.seeGraph')}
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
                        <span className="font-medium" style={{ color: seriesColor.income }}>{t('director.income')}</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.outcome}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, outcome: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.outcome }}>{t('director.outcome')}</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleSeries.profit}
                          onChange={(e) =>
                            setVisibleSeries((prev) => ({ ...prev, profit: e.target.checked }))
                          }
                        />
                        <span className="font-medium" style={{ color: seriesColor.profit }}>{t('director.profit')}</span>
                      </label>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="h-[320px] min-w-[760px] w-full"
                        role="img"
                        aria-label={t('director.chartAriaMonthly')}
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

              {viewMode === 'monthly' ? (
                <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="text-lg font-semibold text-slate-900">{t('director.incomeBreakdownTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t('director.incomeByDentists')}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {(financeOverview?.incomeBreakdown?.byDentists ?? []).map((item) => (
                      <div key={item.staffId} className="flex justify-between">
                        <span className="text-slate-600">{item.name} {item.surname}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {(financeOverview?.incomeBreakdown?.byDentists ?? []).length === 0 ? (
                      <p className="text-slate-500">{t('director.noDentistIncome')}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="text-lg font-semibold text-slate-900">{t('director.outcomeBreakdownTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('director.outcomeBreakdownSubtitle')}
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('director.totalOutcome')}</span>
                      <span className="font-semibold">
                        {formatCurrency(financeOverview?.outcome?.total ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('director.salaries')}</span>
                      <span className="font-medium">
                        {formatCurrency(financeOverview?.outcome?.totalSalaries ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('director.medicinePurchases')}</span>
                      <span className="font-medium">
                        {formatCurrency(financeOverview?.outcome?.totalMedicinePurchases ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('director.otherPayments')}</span>
                      <span className="font-medium">
                        {formatCurrency(financeOverview?.outcome?.totalOtherPaymentDetails ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="text-lg font-semibold text-slate-900">{t('director.salaryDetailsTitle')}</h2>
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
                          {salary.role ?? t('director.staffRoleFallback')} |{' '}
                          {salary.type === 'percentage'
                            ? t('director.salaryTypePercent', {
                                pct: salary.percentage ?? 0,
                                amount: formatCurrency(salary.treatmentCost ?? 0),
                              })
                            : t('director.salaryTypeFixed')}
                        </p>
                      </div>
                    ))}
                    {(financeOverview?.outcome?.salaries ?? []).length === 0 ? (
                      <p className="text-slate-500">{t('director.noSalary')}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">{t('director.expensesTitle')}</h2>
                    <button
                      type="button"
                      onClick={() => {
                        resetFinanceCreateState();
                        setShowAddExpenseModal(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                    >
                      <Plus size={14} />
                      {t('director.addExpense')}
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {expenseGroups.map((group) => {
                      const isExpenseExpanded = expandedExpenses.has(group.key);
                      return (
                        <div
                          key={group.key}
                          className="rounded-md border border-slate-200 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800">
                                {group.expenseName}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {group.expenseId != null ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpenseForPayment({
                                      id: group.expenseId,
                                      name: group.expenseName,
                                    });
                                    setNewPaymentDetail({
                                      date: buildDefaultPaymentDate(selectedYear, selectedMonth),
                                      cost: 0,
                                    });
                                    setFinanceSubmitError(null);
                                    setShowAddPaymentModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <Plus size={12} />
                                  {t('director.payment')}
                                </button>
                              ) : null}
                              <span className="font-semibold text-slate-900">
                                -{formatCurrency(group.totalCost)}
                              </span>
                              {group.paymentDetails.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpenseExpanded(group.key)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  {isExpenseExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {isExpenseExpanded ? t('director.hidePayments') : t('director.showPayments')}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {isExpenseExpanded ? (
                            <div className="mt-2 rounded-md bg-slate-50 p-2">
                              {group.paymentDetails.map((paymentDetail) => {
                                const isPaymentExpanded = expandedPaymentDetails.has(paymentDetail.id);
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
                                          {isPaymentExpanded ? t('director.hideMedicines') : t('director.showMedicines')}
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
                                              {t('director.medicineLine', {
                                                name: purchase.medicineName ?? '-',
                                                count: purchase.count,
                                              })}
                                            </span>
                                            <span className="font-medium text-slate-900">
                                              {t('director.totalCostPrefix')} {formatCurrency(purchase.totalPrice)}
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
                    {expenseGroups.length === 0 ? (
                      <p className="text-slate-500">{t('director.noExpenses')}</p>
                    ) : null}
                  </div>
                </div>
              </div>
                </>
              ) : null}
            </div>
          </main>
        </ClinicPortalShell>
      </div>
      {showAddExpenseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{t('director.modalAddExpenseTitle')}</h3>
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
                <label className="mb-1 block text-xs text-slate-600">{t('director.expenseName')}</label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">{t('director.descriptionOptional')}</label>
                <textarea
                  value={newExpense.description ?? ''}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">{t('director.fixedCostOptional')}</label>
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
                  <label className="mb-1 block text-xs text-slate-600">{t('director.dayOfMonthOptional')}</label>
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
                  <label className="mb-1 block text-xs text-slate-600">{t('director.paymentDate')}</label>
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
                  <label className="mb-1 block text-xs text-slate-600">{t('director.paymentCost')}</label>
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
                  {t('shared.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExpenseWithPayment}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isCreatingExpenseWithPayment ? t('shared.saving') : t('shared.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showAddPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {t('director.addPaymentTitle', {
                  name: selectedExpenseForPayment?.name ?? t('director.expenseFallbackName'),
                })}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddPaymentModal(false);
                  setSelectedExpenseForPayment(null);
                  setFinanceSubmitError(null);
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePaymentForExpense} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">{t('director.paymentDate')}</label>
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
                <label className="mb-1 block text-xs text-slate-600">{t('director.paymentCost')}</label>
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
              {financeSubmitError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {financeSubmitError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPaymentModal(false);
                    setSelectedExpenseForPayment(null);
                    setFinanceSubmitError(null);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {t('shared.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExpenseWithPayment}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isCreatingExpenseWithPayment ? t('shared.saving') : t('shared.save')}
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
};

export default DirectorFinance;
