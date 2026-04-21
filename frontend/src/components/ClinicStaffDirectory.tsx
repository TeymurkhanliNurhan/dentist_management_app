import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, {
  dentistService,
  salaryService,
  staffService,
  toothTreatmentService,
  type DentistProfile,
  type SalaryRecord,
  type StaffListRecord,
  type ToothTreatment,
} from '../services/api';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';

type SalaryMode = 'fixed' | 'percentage';
type TreatmentPeriod = 'today' | 'week' | 'month';

type StaffDirectoryRoleBucket = 'dentist' | 'nurse' | 'frontdesk' | 'director' | 'staff';

const STAFF_DIR_VISIBLE_ROLES_KEY = 'directorStaffDirectoryVisibleRoles';

const ALL_STAFF_DIRECTORY_ROLE_BUCKETS: StaffDirectoryRoleBucket[] = [
  'dentist',
  'nurse',
  'frontdesk',
  'director',
  'staff',
];

const ROLE_BUCKET_LABEL: Record<StaffDirectoryRoleBucket, string> = {
  dentist: 'Dentist',
  nurse: 'Nurse',
  frontdesk: 'Front desk',
  director: 'Director',
  staff: 'Other',
};

function readVisibleRoleBucketsFromStorage(): Set<StaffDirectoryRoleBucket> {
  try {
    const raw = localStorage.getItem(STAFF_DIR_VISIBLE_ROLES_KEY);
    if (!raw) return new Set(ALL_STAFF_DIRECTORY_ROLE_BUCKETS);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(ALL_STAFF_DIRECTORY_ROLE_BUCKETS);
    const next = new Set<StaffDirectoryRoleBucket>();
    for (const item of parsed) {
      if (typeof item === 'string' && ALL_STAFF_DIRECTORY_ROLE_BUCKETS.includes(item as StaffDirectoryRoleBucket)) {
        next.add(item as StaffDirectoryRoleBucket);
      }
    }
    return next.size > 0 ? next : new Set(ALL_STAFF_DIRECTORY_ROLE_BUCKETS);
  } catch {
    return new Set(ALL_STAFF_DIRECTORY_ROLE_BUCKETS);
  }
}

function inferRoleBucketFromStaffRecord(staff: StaffListRecord): StaffDirectoryRoleBucket {
  const r = (staff.role ?? '').toLowerCase().trim();
  if (r === 'nurse' || r.includes('nurse')) return 'nurse';
  if (r === 'frontdesk' || r.includes('frontdesk') || r.includes('front desk')) return 'frontdesk';
  if (r === 'director' || r.includes('director')) return 'director';
  if (r === 'dentist' || r.includes('dentist')) return 'dentist';
  return 'staff';
}

type DirectoryTableRow = {
  key: string;
  roleBucket: StaffDirectoryRoleBucket;
  dentistId: number | null;
  staffId: number;
  name: string;
  surname: string;
  gmail: string;
};

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
  const [staffMembers, setStaffMembers] = useState<StaffListRecord[]>([]);
  const [visibleRoleBuckets, setVisibleRoleBuckets] = useState<Set<StaffDirectoryRoleBucket>>(
    () => readVisibleRoleBucketsFromStorage(),
  );
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
    try {
      localStorage.setItem(STAFF_DIR_VISIBLE_ROLES_KEY, JSON.stringify([...visibleRoleBuckets]));
    } catch {
      /* ignore */
    }
  }, [visibleRoleBuckets]);

  useEffect(() => {
    const load = async () => {
      if (role !== 'director') return;
      setLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        const [dentistRows, salaryRows, staffRows] = await Promise.all([
          dentistService.getAll(),
          salaryService.getAll(),
          staffService.getAll({ active: true }),
        ]);

        const sortedDentists = [...dentistRows].sort((a, b) =>
          `${a.staff?.surname ?? ''} ${a.staff?.name ?? ''}`.localeCompare(
            `${b.staff?.surname ?? ''} ${b.staff?.name ?? ''}`,
          ),
        );
        setDentists(sortedDentists);
        setStaffMembers(Array.isArray(staffRows) ? staffRows : []);

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
        setStaffMembers([]);
        setSalariesByStaffId({});
        setTreatmentsByDentistId({});
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  const directoryRows: DirectoryTableRow[] = useMemo(() => {
    const dentistStaffIds = new Set(dentists.map((d) => d.staffId));
    const dentistPart: DirectoryTableRow[] = dentists.map((d) => ({
      key: `dentist-${d.id}`,
      roleBucket: 'dentist',
      dentistId: d.id,
      staffId: d.staffId,
      name: d.staff?.name ?? '',
      surname: d.staff?.surname ?? '',
      gmail: d.staff?.gmail ?? '',
    }));

    const others: DirectoryTableRow[] = staffMembers
      .filter((s) => !dentistStaffIds.has(s.id))
      .map((s) => ({
        key: `staff-${s.id}`,
        roleBucket: inferRoleBucketFromStaffRecord(s),
        dentistId: null,
        staffId: s.id,
        name: s.name,
        surname: s.surname,
        gmail: s.gmail,
      }));

    others.sort((a, b) =>
      `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, undefined, { sensitivity: 'base' }),
    );

    return [...dentistPart, ...others];
  }, [dentists, staffMembers]);

  const visibleDirectoryRows = useMemo(
    () => directoryRows.filter((row) => visibleRoleBuckets.has(row.roleBucket)),
    [directoryRows, visibleRoleBuckets],
  );

  const toggleRoleBucketFilter = (bucket: StaffDirectoryRoleBucket) => {
    setVisibleRoleBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  const toggleStaffSelection = (staffId: number) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const formatSalaryDisplay = (staffId: number): { kind: 'none' | 'fixed' | 'percentage'; label: string } => {
    const salary = salariesByStaffId[staffId];
    if (!salary) return { kind: 'none', label: '—' };
    if (salary.salary != null) {
      const dayText = salary.salaryDay != null ? ` · day ${salary.salaryDay}` : '';
      return { kind: 'fixed', label: `$${Number(salary.salary).toFixed(2)}${dayText}` };
    }
    if (salary.treatmentPercentage != null) {
      return { kind: 'percentage', label: `${Number(salary.treatmentPercentage).toFixed(2)}%` };
    }
    return { kind: 'none', label: '—' };
  };

  const treatmentPeriodLabel =
    treatmentPeriod === 'today' ? 'Today' : treatmentPeriod === 'week' ? 'Week' : 'Month';

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
    const primaryRow = directoryRows.find((r) => r.staffId === activeStaffId);
    const targets =
      applyToSelectedOthers && selectedTargets.length > 0
        ? Array.from(new Set([activeStaffId, ...selectedTargets.map((d) => d.staffId)]))
        : [activeStaffId];

    if (!primaryRow) {
      setError('Selected staff member was not found.');
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
      setSuccessMessage(`Updated salary settings for ${targets.length} staff member(s).`);
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
              <h1 className="text-3xl font-bold text-slate-900">Clinic staff and salaries</h1>
              <p className="mt-2 text-sm text-slate-500">
                Dentists are listed first with treatment counts and totals for the selected period. Other staff
                appear below; treatment and total are not applicable for those roles. Click a salary cell to edit.
                Use the role checkboxes to choose who appears in the table.
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

            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <span className="font-semibold text-slate-800">Roles in table</span>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ALL_STAFF_DIRECTORY_ROLE_BUCKETS.map((bucket) => (
                  <label key={bucket} className="inline-flex cursor-pointer items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={visibleRoleBuckets.has(bucket)}
                      onChange={() => toggleRoleBucketFilter(bucket)}
                    />
                    <span>{ROLE_BUCKET_LABEL[bucket]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#f3f4f6] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                      <th className="px-6 py-4 text-left font-semibold">Role</th>
                      <th className="px-6 py-4 text-left font-semibold">Full name</th>
                      <th className="px-6 py-4 text-left font-semibold">Email</th>
                      <th className="px-6 py-4 text-left font-semibold">Salary</th>
                      <th className="px-6 py-4 text-center font-semibold">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => shiftPeriod(-1)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300/90 bg-white text-slate-600 transition hover:bg-slate-50"
                              aria-label="Previous period"
                            >
                              <ChevronLeft size={16} strokeWidth={2} />
                            </button>
                            <span className="tracking-[0.06em]">Treatment</span>
                            <span className="relative inline-flex items-center">
                              <ChevronDown size={14} className="text-slate-500" strokeWidth={2} aria-hidden />
                              <select
                                value={treatmentPeriod}
                                onChange={(e) => setTreatmentPeriod(e.target.value as TreatmentPeriod)}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                aria-label="Treatment period"
                              >
                                <option value="today">Today</option>
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                              </select>
                            </span>
                            <button
                              type="button"
                              onClick={() => shiftPeriod(1)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300/90 bg-white text-slate-600 transition hover:bg-slate-50"
                              aria-label="Next period"
                            >
                              <ChevronRight size={16} strokeWidth={2} />
                            </button>
                          </div>
                          <span className="text-[10px] font-normal normal-case tracking-normal text-slate-400">
                            {treatmentPeriodLabel}
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          Loading…
                        </td>
                      </tr>
                    ) : directoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No staff found.
                        </td>
                      </tr>
                    ) : visibleDirectoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No rows match the selected roles. Turn on at least one role above.
                        </td>
                      </tr>
                    ) : (
                      visibleDirectoryRows.map((row) => {
                        const salaryDisp = formatSalaryDisplay(row.staffId);
                        const isDentistRow = row.dentistId != null;
                        const { count, total } =
                          isDentistRow && row.dentistId != null
                            ? getPeriodTreatmentStats(row.dentistId)
                            : { count: 0, total: 0 };
                        return (
                          <tr key={row.key} className="bg-white">
                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                              {ROLE_BUCKET_LABEL[row.roleBucket]}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-900">
                              {row.name} {row.surname}
                            </td>
                            <td className="max-w-[280px] truncate px-6 py-4 font-normal text-slate-500">
                              {row.gmail?.trim() ? row.gmail : '—'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <button
                                type="button"
                                onClick={() => openSalaryEditor(row.staffId)}
                                className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left transition hover:opacity-80"
                              >
                                {salaryDisp.kind === 'percentage' ? (
                                  <span className="font-semibold text-[#0b7dd5]">{salaryDisp.label}</span>
                                ) : salaryDisp.kind === 'fixed' ? (
                                  <span className="font-medium text-slate-800">{salaryDisp.label}</span>
                                ) : (
                                  <span className="font-medium text-slate-500">{salaryDisp.label}</span>
                                )}
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-center">
                              {isDentistRow ? (
                                <span
                                  className={`inline-block text-base font-medium tabular-nums ${
                                    count > 0 ? 'cursor-pointer text-[#0b7dd5]' : 'text-slate-600'
                                  }`}
                                >
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right font-normal tabular-nums text-slate-500">
                              {isDentistRow ? `$${total.toFixed(2)}` : <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        );
                      })
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
