import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, Wallet, Activity } from 'lucide-react';
import { dentistService, type DentistFinanceOverview } from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type GraphMode = 'daily' | 'weekly' | 'monthly';

const DentistFinance = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dentistDisplayName, setDentistDisplayName] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [graphMode, setGraphMode] = useState<GraphMode>('daily');
  const [financeData, setFinanceData] = useState<DentistFinanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dentistService.getFinanceOverview({ year, month });
      setFinanceData(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to fetch dentist finance overview');
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
  const chartPadding = { top: 24, right: 24, bottom: 42, left: 56 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  let graphData: Array<{ label: string; value: number }> = [];
  if (financeData) {
    if (graphMode === 'daily') {
      graphData = Array.from({ length: 7 }, (_, i) => {
        const day = i + 1;
        const record = financeData.graphs.daily.find(d => d.day === day);
        return { label: DAY_LABELS[i], value: record?.commission ?? 0 };
      });
    } else if (graphMode === 'weekly') {
      // Typically up to 5 weeks in a month
      graphData = Array.from({ length: 5 }, (_, i) => {
        const week = i + 1;
        const record = financeData.graphs.weekly.find(w => w.week === week);
        return { label: `Week ${week}`, value: record?.commission ?? 0 };
      });
    } else if (graphMode === 'monthly') {
      graphData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const record = financeData.graphs.monthly.find(m => m.month === month);
        return { label: MONTH_LABELS[i], value: record?.commission ?? 0 };
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

  return (
    <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
      <ClinicPortalShell
        brandTitle="ClinicalPrecision"
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
                  {MONTH_LABELS[selectedMonth - 1]} {selectedYear} Performance Metrics
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
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => fetchFinanceOverview(selectedYear, selectedMonth)}
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
                    <div className="mt-3 flex gap-4 text-xs">
                      {(financeData?.treatmentsOperated.breakdown ?? []).map((t, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-slate-500 uppercase tracking-wider">{t.name}</p>
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
                          onClick={() => setGraphMode('daily')}
                          className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Daily
                        </button>
                        <button
                          onClick={() => setGraphMode('weekly')}
                          className={`rounded px-3 py-1 text-xs font-medium ${graphMode === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Weekly
                        </button>
                        <button
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
                        
                        {graphData.map((point, index) => (
                          <circle
                            key={`dot-${index}`}
                            cx={chartXForIndex(index)}
                            cy={chartYForValue(point.value)}
                            r={4}
                            fill="white"
                            stroke="#0ea5e9"
                            strokeWidth={2}
                          />
                        ))}
                      </svg>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold text-slate-900">Treatment Mix</h2>
                    <div className="mt-6 space-y-6">
                      {(financeData?.treatmentMix ?? []).map((t, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm font-medium mb-2">
                            <span className="text-slate-700">{t.name}</span>
                            <span className="text-sky-700">{t.percentage.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-slate-700 rounded-full"
                              style={{ width: `${t.percentage}%` }}
                            />
                          </div>
                          <div className="mt-1 text-right text-xs text-slate-500">
                            {formatCurrency(t.commission)} Comm.
                          </div>
                        </div>
                      ))}
                      {(financeData?.treatmentMix ?? []).length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No treatments recorded.</p>
                      )}
                    </div>
                  </div>
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
