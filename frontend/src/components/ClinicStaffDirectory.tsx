import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, {
  dentistService,
  salaryService,
  toothTreatmentService,
  type DentistProfile,
  type SalaryRecord,
  type ToothTreatment,
} from '../services/api';
import { ChevronDown, X } from 'lucide-react';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';

type SalaryMode = 'fixed' | 'percentage';
type TreatmentPeriod = 'today' | 'week' | 'month';

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const ClinicStaffDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dentists, setDentists] = useState<DentistProfile[]>([]);
  const [salariesByStaffId, setSalariesByStaffId] = useState<Record<number, SalaryRecord>>({});
  const [treatmentsByDentistId, setTreatmentsByDentistId] = useState<Record<number, ToothTreatment[]>>({});
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [treatmentPeriod, setTreatmentPeriod] = useState<TreatmentPeriod>('today');
  const [periodAnchorDate, setPeriodAnchorDate] = useState<Date>(() => startOfDay(new Date()));
  const [activeStaffId, setActiveStaffId] = useState<number | null>(null);
  const [salaryMode, setSalaryMode] = useState<SalaryMode>('fixed');
  const [salaryValue, setSalaryValue] = useState('');
  const [salaryDay, setSalaryDay] = useState('');
  const [applyToSelectedOthers, setApplyToSelectedOthers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (role !== 'director') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, role]);

  useEffect(() => {
    const loadSelf = async () => {
      const staffIdRaw = localStorage.getItem('staffId');
      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) return;
      try {
        const response = await api.get(`/staff?id=${staffId}`);
        const staff = Array.isArray(response.data) ? response.data[0] : response.data;
        setDisplayName(`${staff?.name ?? ''} ${staff?.surname ?? ''}`.trim());
      } catch {
        setDisplayName('');
      }
    };
    if (role === 'director') void loadSelf();
  }, [role]);

  useEffect(() => {
    const load = async () => {
      if (role !== 'director') return;
      setLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        const [dentistRows, salaryRows] = await Promise.all([
          dentistService.getAll(),
          salaryService.getAll(),
        ]);

        const sortedDentists = [...dentistRows].sort((a, b) =>
          `${a.staff?.surname ?? ''} ${a.staff?.name ?? ''}`.localeCompare(
            `${b.staff?.surname ?? ''} ${b.staff?.name ?? ''}`,
          ),
        );
        setDentists(sortedDentists);

        const nextSalaryMap: Record<number, SalaryRecord> = {};
        for (const salary of salaryRows) {
          nextSalaryMap[salary.staffId] = salary;
        }
        setSalariesByStaffId(nextSalaryMap);

        const treatmentRows = await toothTreatmentService.getAll();
        const groupedTreatments: Record<number, ToothTreatment[]> = {};
        for (const treatment of treatmentRows) {
          const dentistId = treatment.dentist?.id;
          if (!dentistId) continue;
          if (!groupedTreatments[dentistId]) groupedTreatments[dentistId] = [];
          groupedTreatments[dentistId].push(treatment);
        }
        setTreatmentsByDentistId(groupedTreatments);
        setSelectedStaffIds(new Set());
      } catch (err: unknown) {
        console.error('Failed to load dentist salary data:', err);
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message || 'Failed to load dentists');
        setDentists([]);
        setSalariesByStaffId({});
        setTreatmentsByDentistId({});
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  const toggleStaffSelection = (staffId: number) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const formatSalaryPart = (staffId: number) => {
    const salary = salariesByStaffId[staffId];
    if (!salary) return 'Not set';
    if (salary.salary != null) {
      const dayText = salary.salaryDay != null ? ` (day ${salary.salaryDay})` : '';
      return `$${Number(salary.salary).toFixed(2)}${dayText}`;
    }
    if (salary.treatmentPercentage != null) {
      return `${Number(salary.treatmentPercentage).toFixed(2)}% per treatment`;
    }
    return 'Not set';
  };

  const currentPeriodRange = useMemo(() => {
    const start = startOfDay(periodAnchorDate);
    const end = new Date(start);

    if (treatmentPeriod === 'today') {
      end.setDate(end.getDate() + 1);
      return { start, end };
    }

    if (treatmentPeriod === 'week') {
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
      return { start, end };
    }

    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  }, [periodAnchorDate, treatmentPeriod]);

  const treatmentStatsByDentistId = useMemo(() => {
    const result: Record<
      number,
      { periodCount: number; periodTotal: number }
    > = {};

    for (const dentist of dentists) {
      const list = treatmentsByDentistId[dentist.id] ?? [];
      let periodCount = 0;
      let periodTotal = 0;

      for (const item of list) {
        const effectiveDate = item.lastRandevueDate ?? item.appointment?.startDate ?? '';
        const ts = new Date(effectiveDate);
        if (Number.isNaN(ts.getTime())) continue;
        const fee = Number(item.feeSnapshot ?? item.treatment?.price ?? 0);

        if (ts >= currentPeriodRange.start && ts < currentPeriodRange.end) {
          periodCount += 1;
          periodTotal += fee;
        }
      }

      result[dentist.id] = {
        periodCount,
        periodTotal,
      };
    }
    return result;
  }, [currentPeriodRange.end, currentPeriodRange.start, dentists, treatmentsByDentistId]);

  const getPeriodTreatmentStats = (dentistId: number) => {
    const stats = treatmentStatsByDentistId[dentistId];
    if (!stats) return { count: 0, total: 0 };
    return { count: stats.periodCount, total: stats.periodTotal };
  };

  const shiftPeriod = (direction: -1 | 1) => {
    setPeriodAnchorDate((previous) => {
      const next = startOfDay(previous);
      if (treatmentPeriod === 'today') {
        next.setDate(next.getDate() + direction);
        return next;
      }
      if (treatmentPeriod === 'week') {
        next.setDate(next.getDate() + direction * 7);
        return next;
      }
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const openSalaryEditor = (staffId: number) => {
    const current = salariesByStaffId[staffId];
    if (current?.salary != null) {
      setSalaryMode('fixed');
      setSalaryValue(String(current.salary));
    } else if (current?.treatmentPercentage != null) {
      setSalaryMode('percentage');
      setSalaryValue(String(current.treatmentPercentage));
    } else {
      setSalaryMode('fixed');
      setSalaryValue('');
    }
    setSalaryDay(current?.salaryDay != null ? String(current.salaryDay) : '');
    setApplyToSelectedOthers(false);
    setActiveStaffId(staffId);
    setError('');
    setSuccessMessage('');
  };

  const saveSalaryChanges = async () => {
    if (activeStaffId == null) return;
    const selectedTargets = dentists.filter((d) => selectedStaffIds.has(d.staffId));
    const primary = dentists.find((d) => d.staffId === activeStaffId);
    const targets =
      applyToSelectedOthers && selectedTargets.length > 0
        ? Array.from(new Set([activeStaffId, ...selectedTargets.map((d) => d.staffId)]))
        : [activeStaffId];

    if (!primary) {
      setError('Selected dentist was not found.');
      return;
    }
    const parsedValue = Number(salaryValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError('Enter a valid non-negative value.');
      return;
    }
    const parsedSalaryDay = Number(salaryDay);
    if (!Number.isInteger(parsedSalaryDay) || parsedSalaryDay < 1 || parsedSalaryDay > 31) {
      setError('Salary day is required and must be between 1 and 31.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      await Promise.all(
        targets.map(async (staffId) => {
          const existing = salariesByStaffId[staffId];
          const payload =
            salaryMode === 'fixed'
              ? {
                  salary: parsedValue,
                  salaryDay: parsedSalaryDay,
                  treatmentPercentage: null,
                }
              : {
                  salary: null,
                  salaryDay: parsedSalaryDay,
                  treatmentPercentage: parsedValue,
                };

          if (existing) {
            return await salaryService.update(staffId, payload);
          }
          return await salaryService.create({
            staffId,
            salary: payload.salary == null ? undefined : payload.salary,
            salaryDay: payload.salaryDay == null ? undefined : payload.salaryDay,
            treatmentPercentage:
              payload.treatmentPercentage == null ? undefined : payload.treatmentPercentage,
          });
        }),
      );

      const freshSalaryRows = await salaryService.getAll();
      const nextSalaryMap: Record<number, SalaryRecord> = {};
      for (const row of freshSalaryRows) nextSalaryMap[row.staffId] = row;
      setSalariesByStaffId(nextSalaryMap);
      setSuccessMessage(`Updated salary settings for ${targets.length} dentist(s).`);
      setActiveStaffId(null);
    } catch (err: unknown) {
      console.error('Failed to update salaries:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to update salary settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== 'director') {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Precision Dental"
          portalBadge="Admin Portal"
          userDisplayName={displayName}
          userSubtitle="Clinic Director"
          menuItems={DIRECTOR_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        >
          <main className="h-[calc(100vh-4rem)] flex-1 overflow-auto bg-[#f9fafb] px-6 py-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900">Dentist salary management</h1>
              <p className="mt-2 text-sm text-slate-500">
                Click salary value to open the edit board.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            {successMessage ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Full name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Salary part</th>
                      <th className="px-4 py-3">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => shiftPeriod(-1)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Previous
                          </button>
                          <span>Treatment</span>
                          <ChevronDown size={14} />
                          <select
                            value={treatmentPeriod}
                            onChange={(e) => setTreatmentPeriod(e.target.value as TreatmentPeriod)}
                            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-medium text-slate-600"
                          >
                            <option value="today">Today</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => shiftPeriod(1)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Next
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          Loading…
                        </td>
                      </tr>
                    ) : dentists.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          No dentists found.
                        </td>
                      </tr>
                    ) : (
                      dentists.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                            {row.staff?.name} {row.staff?.surname}
                          </td>
                          <td className="max-w-[260px] truncate px-4 py-3 text-slate-600">{row.staff?.gmail ?? '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            <button
                              type="button"
                              onClick={() => openSalaryEditor(row.staffId)}
                              className="rounded px-1 py-0.5 font-medium text-[#0066A6] transition hover:bg-slate-100 hover:text-[#00588f]"
                            >
                              {formatSalaryPart(row.staffId)}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {getPeriodTreatmentStats(row.id).count}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            ${getPeriodTreatmentStats(row.id).total.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
          {activeStaffId != null && (
            <aside className="h-[calc(100vh-4rem)] w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Edit salary</h2>
                <button
                  type="button"
                  onClick={() => setActiveStaffId(null)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close salary editor"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="salaryModeDrawer"
                      value="fixed"
                      checked={salaryMode === 'fixed'}
                      onChange={() => setSalaryMode('fixed')}
                    />
                    Fixed salary
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="salaryModeDrawer"
                      value="percentage"
                      checked={salaryMode === 'percentage'}
                      onChange={() => setSalaryMode('percentage')}
                    />
                    Treatment percentage
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {salaryMode === 'fixed' ? 'Salary amount' : 'Percentage value'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={salaryValue}
                    onChange={(e) => setSalaryValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Salary day (1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={salaryDay}
                    onChange={(e) => setSalaryDay(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={applyToSelectedOthers}
                    onChange={(e) => setApplyToSelectedOthers(e.target.checked)}
                  />
                  <span>
                    Apply this change to multiple dentists.
                  </span>
                </label>

                {applyToSelectedOthers && (
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Select dentists
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {dentists.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedStaffIds.has(d.staffId)}
                            onChange={() => toggleStaffSelection(d.staffId)}
                          />
                          <span>
                            {d.staff?.name} {d.staff?.surname}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{selectedStaffIds.size} selected</p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveSalaryChanges()}
                  className="w-full rounded-lg bg-[#0066A6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00588f] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save salary changes'}
                </button>
              </div>
            </aside>
          )}
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

export default ClinicStaffDirectory;
