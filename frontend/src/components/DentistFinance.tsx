import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, Wallet, Activity } from 'lucide-react';
import { dentistService, type DentistFinanceOverview } from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';
import { useTranslation } from 'react-i18next';
import { appLocaleTag, formatMonthLabel, formatMonthLabelByIndex1 } from '../lib/localeHelpers';

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type GraphMode = 'daily' | 'weekly' | 'monthly';

const DentistFinance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('finance');
  const locale = appLocaleTag(i18n.language);
  const janMondayAnchor = useMemo(() => new Date(2024, 0, 1, 12, 0, 0), []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dentistDisplayName, setDentistDisplayName] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [graphMode, setGraphMode] = useState<GraphMode>('daily');
  const [financeData, setFinanceData] = useState<DentistFinanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [visibleRecentCount, setVisibleRecentCount] = useState(7);

  const fetchFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dentistService.getFinanceOverview({ year, month });
      setFinanceData(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('dentist.errFetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const staffName = localStorage.getItem('name') ?? '';
    const staffSurname = localStorage.getItem('surname') ?? '';
    setDentistDisplayName(`${staffName} ${staffSurname}`.trim());
    void fetchFinanceOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const d = new Date(janMondayAnchor);
        d.setDate(janMondayAnchor.getDate() + (day - 1));
        const record = financeData.graphs.daily.find((dv) => dv.day === day);
        return {
          label: d.toLocaleDateString(locale, { weekday: 'short' }),
          value: record?.commission ?? 0,
        };
      });
    } else if (graphMode === 'weekly') {
      graphData = Array.from({ length: 5 }, (_, i) => {
        const week = i + 1;
        const record = financeData.graphs.weekly.find((w) => w.week === week);
        return { label: t('dentist.weeklyLabel', { n: week }), value: record?.commission ?? 0 };
      });
    } else if (graphMode === 'monthly') {
      graphData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const record = financeData.graphs.monthly.find((m) => m.month === month);
        return {
          label: formatMonthLabelByIndex1(month, i18n.language, 'short'),
          value: record?.commission ?? 0,
        };
      });
    }
  }

  const values = graphData.map(d => d.value);
  const chartMaxRaw = values.length > 0 ? Math.max(...values) : 0;
  const chartMax = Math.max(10, chartMaxRaw * 1.2); // Give some headroom
  const chartMin = 0;
  const chartRange = chartMax - chartMin;

  const chartXForIndex = (index: number) =>
    chartPadding.left + (graphData.length > 1 ? (index / (graphData.length - 1)) * plotWidth : plotWidth / 2);
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

  const performanceMonthLabel = formatMonthLabelByIndex1(selectedMonth, i18n.language, 'short');

  return (
    <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
      <ClinicPortalShell
        brandTitle={t('dentist.clinicalBrand')}
        portalBadge="Dentist Portal"
        userDisplayName={dentistDisplayName || '-'}
        userSubtitle="Clinic Dentist"
        menuItems={DENTIST_PORTAL_MENU}
        pathname={location.pathname}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        navigate={navigate}
        onLogoutClick={() => {
          localStorage.clear();
          navigate('/login');
        }}
        headerActions={
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label={t('dentist.settingsAria')}
          >
            <Settings size={16} />
          </button>
        }
      >
        <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('dentist.title')}</h1>
                <p className="text-sm text-slate-500">
                  {t('dentist.subtitlePerformance', { month: performanceMonthLabel, year: selectedYear })}
                </p>
              </div>
              <div className="flex items-end gap-2">
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
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('shared.month')}</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const mi = i + 1;
                      const lbl = formatMonthLabelByIndex1(mi, i18n.language, 'short');
                      return (
                        <option key={mi} value={mi}>{lbl}</option>
                      );
                    })}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => fetchFinanceOverview(selectedYear, selectedMonth)}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  {t('shared.refresh')}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="text-sm text-slate-500">{t('dentist.loading')}</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Wallet size={16} className="text-slate-400" />
                      {t('dentist.monthlyCommission', { pct: financeData?.commissionRate ?? 0 })}
                    </div>
                    <p className="mt-3 text-4xl font-bold text-sky-700">
                      {formatCurrency(financeData?.monthlyCommission ?? 0)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Activity size={16} className="text-slate-400" />
                      {t('dentist.treatmentsOperated')}
                    </div>
                    <p className="mt-3 text-4xl font-bold text-slate-900">
                      {financeData?.treatmentsOperated.total ?? 0}
                    </p>
                    <div className="mt-3 flex gap-4 text-xs">
                      {(financeData?.treatmentsOperated.breakdown ?? []).map((row, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-slate-500 uppercase tracking-wider">{row.name}</p>
                          <p className="text-sm font-bold text-sky-700">{row.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">{t('dentist.incomeTrends')}</h2>
                      <div className="flex rounded-md bg-slate-100 p-1">
                        <button
                          onClick={() => setGraphMode('daily')}
                          className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('dentist.daily')}
                        </button>
                        <button
                          onClick={() => setGraphMode('weekly')}
                          className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('dentist.weekly')}
                        </button>
                        <button
                          onClick={() => setGraphMode('monthly')}
                          className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {t('dentist.monthlyTrend')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 w-full">
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="h-auto w-full"
                        role="img"
                        aria-label={t('dentist.chartAria')}
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

                        {graphData.map((point, index) => {
                          return (
                            <text
                              key={index}
                              x={chartXForIndex(index)}
                              y={chartHeight - chartPadding.bottom + 18}
                              textAnchor="middle"
                              className="fill-slate-500 text-[10px]"
                            >
                              {point.label}
                            </text>
                          );
                        })}

                        <path d={seriesPath} fill="none" stroke="#0ea5e9" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                        
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
                              {isHovered && (
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
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold text-slate-900">{t('dentist.treatmentMix')}</h2>
                    <div className="mt-6 space-y-6">
                      {(financeData?.treatmentMix ?? []).map((row, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-slate-700">{row.name}</span>
                            <span className="text-sky-700">{row.percentage.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-slate-700 rounded-full"
                              style={{ width: `${row.percentage}%` }}
                            />
                          </div>
                          <div className="mt-1 text-right text-xs text-slate-500">
                            {formatCurrency(row.commission)} {t('dentist.commissionAbbr')}
                          </div>
                        </div>
                      ))}
                      {(financeData?.treatmentMix ?? []).length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">{t('dentist.noTreatments')}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">{t('dentist.recentTreatmentsTitle')}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">{t('dentist.colPatient')}</th>
                          <th className="px-5 py-3 font-medium">{t('dentist.colTreatment')}</th>
                          <th className="px-5 py-3 font-medium">{t('dentist.colDate')}</th>
                          <th className="px-5 py-3 font-medium">
                            {t('dentist.colCommission', { pct: financeData?.commissionRate ?? 0 })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(financeData?.recentOperatedTreatments ?? []).slice(0, visibleRecentCount).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                                  {row.patientInitials}
                                </div>
                                <span className="font-medium text-slate-900">{row.patientName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                {row.treatmentList}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {(() => {
                                const d = new Date(row.date);
                                return i18n.language?.split('-')[0]?.toLowerCase() === 'az'
                                  ? `${d.getDate()} ${formatMonthLabel(d, i18n.language, 'short')} ${d.getFullYear()}`
                                  : d.toLocaleDateString(locale, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    });
                              })()}
                            </td>
                            <td className="px-5 py-4 font-bold text-sky-700">
                              {formatCurrency(row.commission)}
                            </td>
                          </tr>
                        ))}
                        {(financeData?.recentOperatedTreatments ?? []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                              {t('dentist.noRecent')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {financeData && financeData.recentOperatedTreatments.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between">
                      {visibleRecentCount < financeData.recentOperatedTreatments.length ? (
                        <button
                          onClick={() => setVisibleRecentCount(prev => prev + 10)}
                          className="text-sm font-medium text-sky-700 hover:text-sky-800"
                        >
                          {t('dentist.viewMore')}
                        </button>
                      ) : (
                        <div />
                      )}
                      <button className="text-sm font-medium text-slate-500 hover:text-slate-700">
                        {t('dentist.viewAllTransactions')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </ClinicPortalShell>
    </div>
  );
};

export default DentistFinance;
