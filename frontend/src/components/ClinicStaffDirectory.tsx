import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, {
  directorService,
  dentistService,
  frontDeskWorkerService,
  nurseService,
  salaryService,
  staffService,
  toothTreatmentService,
  workingHoursService,
  type DentistProfile,
  type SalaryRecord,
  type StaffListRecord,
  type ToothTreatment,
  type WorkingHoursRecord,
} from '../services/api';
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
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

type NewStaffType = 'staff' | 'dentist' | 'nurse' | 'frontdesk' | 'director';
type WorkingHoursFormState = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toIsoDateInput = (date: Date) => date.toISOString().slice(0, 10);

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
  const [workingHoursByStaffId, setWorkingHoursByStaffId] = useState<Record<number, WorkingHoursRecord[]>>({});
  const [treatmentsByDentistId, setTreatmentsByDentistId] = useState<Record<number, ToothTreatment[]>>({});
  const [expandedStaffRows, setExpandedStaffRows] = useState<Set<number>>(new Set());
  const [workingHoursDraftByStaffId, setWorkingHoursDraftByStaffId] = useState<
    Record<number, WorkingHoursFormState>
  >({});
  const [editingWorkingHoursByStaffId, setEditingWorkingHoursByStaffId] = useState<
    Record<number, WorkingHoursRecord | null>
  >({});
  const [savingWorkingHoursForStaffId, setSavingWorkingHoursForStaffId] = useState<number | null>(null);
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
  const [showCreateStaffForm, setShowCreateStaffForm] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    surname: '',
    birthDate: '',
    gmail: '',
    password: '',
    confirmPassword: '',
    startDate: toIsoDateInput(new Date()),
    staffType: 'staff' as NewStaffType,
    salaryMode: 'fixed' as SalaryMode,
    salaryValue: '',
    salaryDay: '',
  });

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

  const sortWorkingHours = (rows: WorkingHoursRecord[]) =>
    [...rows].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

  const loadDirectoryData = useCallback(async () => {
    if (role !== 'director') return;
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const [dentistRows, salaryRows, staffRows, workingHoursRows] = await Promise.all([
        dentistService.getAll(),
        salaryService.getAll(),
        staffService.getAll({ active: true }),
        workingHoursService.getAll(),
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
      const groupedWorkingHours: Record<number, WorkingHoursRecord[]> = {};
      for (const row of workingHoursRows) {
        if (!groupedWorkingHours[row.staffId]) groupedWorkingHours[row.staffId] = [];
        groupedWorkingHours[row.staffId].push(row);
      }
      const sortedWorkingHours: Record<number, WorkingHoursRecord[]> = {};
      for (const [staffId, rows] of Object.entries(groupedWorkingHours)) {
        sortedWorkingHours[Number(staffId)] = sortWorkingHours(rows);
      }
      setWorkingHoursByStaffId(sortedWorkingHours);

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
      setExpandedStaffRows(new Set());
      setWorkingHoursDraftByStaffId({});
      setEditingWorkingHoursByStaffId({});
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
      setWorkingHoursByStaffId({});
      setTreatmentsByDentistId({});
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void loadDirectoryData();
  }, [loadDirectoryData]);

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
      return { kind: 'fixed', label: `$${Number(salary.salary).toFixed(2)}` };
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

  const toTimeInputValue = (value: string) => value.slice(0, 5);

  const getWorkingHoursDraft = (staffId: number): WorkingHoursFormState =>
    workingHoursDraftByStaffId[staffId] ?? { dayOfWeek: '1', startTime: '09:00', endTime: '17:00' };

  const getEditingWorkingHours = (staffId: number): WorkingHoursRecord | null =>
    editingWorkingHoursByStaffId[staffId] ?? null;

  const toggleExpandedRow = (staffId: number) => {
    setExpandedStaffRows((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
    setWorkingHoursDraftByStaffId((prev) => {
      if (prev[staffId]) return prev;
      return { ...prev, [staffId]: { dayOfWeek: '1', startTime: '09:00', endTime: '17:00' } };
    });
  };

  const updateWorkingHoursDraft = (
    staffId: number,
    key: keyof WorkingHoursFormState,
    value: string,
  ) => {
    setWorkingHoursDraftByStaffId((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] ?? { dayOfWeek: '1', startTime: '09:00', endTime: '17:00' }),
        [key]: value,
      },
    }));
  };

  const startEditingWorkingHours = (staffId: number, row: WorkingHoursRecord) => {
    setEditingWorkingHoursByStaffId((prev) => ({ ...prev, [staffId]: row }));
    setWorkingHoursDraftByStaffId((prev) => ({
      ...prev,
      [staffId]: {
        dayOfWeek: String(row.dayOfWeek),
        startTime: toTimeInputValue(row.startTime),
        endTime: toTimeInputValue(row.endTime),
      },
    }));
  };

  const resetWorkingHoursForm = (staffId: number) => {
    setEditingWorkingHoursByStaffId((prev) => ({ ...prev, [staffId]: null }));
    setWorkingHoursDraftByStaffId((prev) => ({
      ...prev,
      [staffId]: { dayOfWeek: '1', startTime: '09:00', endTime: '17:00' },
    }));
  };

  const saveWorkingHours = async (staffId: number) => {
    const draft = getWorkingHoursDraft(staffId);
    const editing = getEditingWorkingHours(staffId);
    const dayOfWeek = Number(draft.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      setError('Day of week must be between Sunday and Saturday.');
      return;
    }
    if (!draft.startTime || !draft.endTime || draft.startTime >= draft.endTime) {
      setError('Start time must be before end time.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setSavingWorkingHoursForStaffId(staffId);
    try {
      const payload = {
        staffId,
        dayOfWeek,
        startTime: `${draft.startTime}:00`,
        endTime: `${draft.endTime}:00`,
      };
      const saved = editing
        ? await workingHoursService.update(editing.id, payload)
        : await workingHoursService.create(payload);
      setWorkingHoursByStaffId((prev) => {
        const current = prev[staffId] ?? [];
        const next = editing
          ? current.map((row) => (row.id === editing.id ? saved : row))
          : [...current, saved];
        return { ...prev, [staffId]: sortWorkingHours(next) };
      });
      resetWorkingHoursForm(staffId);
      setSuccessMessage(editing ? 'Working hours updated.' : 'Working hours added.');
    } catch (err: unknown) {
      console.error('Failed to save working hours:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to save working hours.');
    } finally {
      setSavingWorkingHoursForStaffId(null);
    }
  };

  const deleteWorkingHours = async (staffId: number, workingHoursId: number) => {
    setError('');
    setSuccessMessage('');
    setSavingWorkingHoursForStaffId(staffId);
    try {
      await workingHoursService.delete(workingHoursId);
      setWorkingHoursByStaffId((prev) => ({
        ...prev,
        [staffId]: (prev[staffId] ?? []).filter((row) => row.id !== workingHoursId),
      }));
      setEditingWorkingHoursByStaffId((prev) => {
        const editing = prev[staffId];
        if (editing?.id !== workingHoursId) return prev;
        return { ...prev, [staffId]: null };
      });
      setSuccessMessage('Working hours deleted.');
    } catch (err: unknown) {
      console.error('Failed to delete working hours:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to delete working hours.');
    } finally {
      setSavingWorkingHoursForStaffId(null);
    }
  };

  const resetCreateStaffForm = () => {
    setNewStaffForm({
      name: '',
      surname: '',
      birthDate: '',
      gmail: '',
      password: '',
      confirmPassword: '',
      startDate: toIsoDateInput(new Date()),
      staffType: 'staff',
      salaryMode: 'fixed',
      salaryValue: '',
      salaryDay: '',
    });
  };

  const handleCreateStaffSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newStaffForm.password !== newStaffForm.confirmPassword) {
      setError('Password and confirmation password must match.');
      return;
    }
    if (newStaffForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    const parsedSalaryValue = Number(newStaffForm.salaryValue);
    if (!Number.isFinite(parsedSalaryValue) || parsedSalaryValue < 0) {
      setError('Salary value must be a non-negative number.');
      return;
    }
    const parsedSalaryDay = Number(newStaffForm.salaryDay);
    if (!Number.isInteger(parsedSalaryDay) || parsedSalaryDay < 1 || parsedSalaryDay > 31) {
      setError('Salary day is required and must be between 1 and 31.');
      return;
    }

    setIsCreatingStaff(true);
    try {
      const createdStaff = await staffService.create({
        name: newStaffForm.name.trim(),
        surname: newStaffForm.surname.trim(),
        birthDate: newStaffForm.birthDate,
        gmail: newStaffForm.gmail.trim(),
        password: newStaffForm.password,
        startDate: newStaffForm.startDate,
        active: true,
      });
      await salaryService.create({
        staffId: createdStaff.id,
        salaryDay: parsedSalaryDay,
        salary: newStaffForm.salaryMode === 'fixed' ? parsedSalaryValue : undefined,
        treatmentPercentage:
          newStaffForm.salaryMode === 'percentage' ? parsedSalaryValue : undefined,
      });

      if (newStaffForm.staffType === 'dentist') {
        await dentistService.create({ staffId: createdStaff.id });
      } else if (newStaffForm.staffType === 'nurse') {
        await nurseService.create({ staffId: createdStaff.id });
      } else if (newStaffForm.staffType === 'frontdesk') {
        await frontDeskWorkerService.create({ staffId: createdStaff.id });
      } else if (newStaffForm.staffType === 'director') {
        await directorService.create({ staffId: createdStaff.id });
      }

      await loadDirectoryData();
      setShowCreateStaffForm(false);
      resetCreateStaffForm();
      setSuccessMessage('Staff member created successfully.');
    } catch (err: unknown) {
      console.error('Failed to create staff member:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to create staff member.');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  if (role !== 'director') {
    return null;
  }

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
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
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Staff</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Dentists are listed first with treatment counts and totals for the selected period. Other staff
                    appear below; treatment and total are not applicable for those roles. Click a salary cell to edit,
                    or click a staff row to manage working hours. Use the role checkboxes to choose who appears in the
                    table.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateStaffForm((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0066A6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00588f]"
                >
                  <Plus size={16} />
                  {showCreateStaffForm ? 'Close form' : 'New staff'}
                </button>
              </div>
            </div>

            {showCreateStaffForm ? (
              <form
                onSubmit={(event) => void handleCreateStaffSubmit(event)}
                className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900">Add new staff member</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
                    <input
                      required
                      type="text"
                      value={newStaffForm.name}
                      onChange={(event) => setNewStaffForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
                    <input
                      required
                      type="text"
                      value={newStaffForm.surname}
                      onChange={(event) => setNewStaffForm((prev) => ({ ...prev, surname: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Birth date</label>
                    <input
                      required
                      type="date"
                      value={newStaffForm.birthDate}
                      onChange={(event) => setNewStaffForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
                    <input
                      required
                      type="date"
                      value={newStaffForm.startDate}
                      onChange={(event) => setNewStaffForm((prev) => ({ ...prev, startDate: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                    <input
                      required
                      type="email"
                      value={newStaffForm.gmail}
                      onChange={(event) => setNewStaffForm((prev) => ({ ...prev, gmail: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                    <input
                      required
                      minLength={6}
                      type="password"
                      value={newStaffForm.password}
                      onChange={(event) => setNewStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
                    <input
                      required
                      minLength={6}
                      type="password"
                      value={newStaffForm.confirmPassword}
                      onChange={(event) =>
                        setNewStaffForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Staff type</label>
                    <select
                      value={newStaffForm.staffType}
                      onChange={(event) =>
                        setNewStaffForm((prev) => ({
                          ...prev,
                          staffType: event.target.value as NewStaffType,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="staff">Other staff</option>
                      <option value="dentist">Dentist</option>
                      <option value="nurse">Nurse</option>
                      <option value="frontdesk">Front desk</option>
                      <option value="director">Director</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Salary type</label>
                    <select
                      value={newStaffForm.salaryMode}
                      onChange={(event) =>
                        setNewStaffForm((prev) => ({
                          ...prev,
                          salaryMode: event.target.value as SalaryMode,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="fixed">Fixed salary</option>
                      <option value="percentage">Treatment percentage</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {newStaffForm.salaryMode === 'fixed' ? 'Salary amount' : 'Percentage value'}
                    </label>
                    <input
                      required
                      min={0}
                      step="0.01"
                      type="number"
                      value={newStaffForm.salaryValue}
                      onChange={(event) =>
                        setNewStaffForm((prev) => ({ ...prev, salaryValue: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Salary day (1-31)</label>
                    <input
                      required
                      min={1}
                      max={31}
                      type="number"
                      value={newStaffForm.salaryDay}
                      onChange={(event) =>
                        setNewStaffForm((prev) => ({ ...prev, salaryDay: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateStaffForm(false);
                      resetCreateStaffForm();
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingStaff}
                    className="rounded-lg bg-[#0066A6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00588f] disabled:opacity-50"
                  >
                    {isCreatingStaff ? 'Creating...' : 'Create staff'}
                  </button>
                </div>
              </form>
            ) : null}

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
                        const isExpanded = expandedStaffRows.has(row.staffId);
                        const workingHoursRows = workingHoursByStaffId[row.staffId] ?? [];
                        const workingHoursDraft = getWorkingHoursDraft(row.staffId);
                        const editingWorkingHours = getEditingWorkingHours(row.staffId);
                        const isSavingWorkingHours = savingWorkingHoursForStaffId === row.staffId;
                        const { count, total } =
                          isDentistRow && row.dentistId != null
                            ? getPeriodTreatmentStats(row.dentistId)
                            : { count: 0, total: 0 };
                        return (
                          <Fragment key={row.key}>
                            <tr
                              className={`cursor-pointer bg-white transition hover:bg-slate-50 ${
                                isExpanded ? 'bg-slate-50' : ''
                              }`}
                              onClick={() => toggleExpandedRow(row.staffId)}
                            >
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
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openSalaryEditor(row.staffId);
                                  }}
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
                            {isExpanded ? (
                              <tr className="bg-slate-50/70">
                                <td colSpan={6} className="px-6 py-4">
                                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                      <h3 className="text-sm font-semibold text-slate-900">Working hours</h3>
                                      {editingWorkingHours ? (
                                        <button
                                          type="button"
                                          onClick={() => resetWorkingHoursForm(row.staffId)}
                                          className="text-xs font-medium text-slate-500 hover:text-slate-700"
                                        >
                                          Cancel edit
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="mb-4 overflow-x-auto">
                                      <table className="min-w-full text-left text-xs">
                                        <thead>
                                          <tr className="border-b border-slate-200 text-slate-500">
                                            <th className="py-2 pr-3 font-semibold">Day</th>
                                            <th className="py-2 pr-3 font-semibold">Start</th>
                                            <th className="py-2 pr-3 font-semibold">End</th>
                                            <th className="py-2 text-right font-semibold">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {workingHoursRows.length === 0 ? (
                                            <tr>
                                              <td colSpan={4} className="py-3 text-slate-400">
                                                No working hours yet.
                                              </td>
                                            </tr>
                                          ) : (
                                            workingHoursRows.map((wh) => (
                                              <tr key={wh.id}>
                                                <td className="py-2 pr-3 text-slate-700">
                                                  {DAY_OF_WEEK_OPTIONS.find((d) => d.value === wh.dayOfWeek)?.label ?? '—'}
                                                </td>
                                                <td className="py-2 pr-3 text-slate-700">{toTimeInputValue(wh.startTime)}</td>
                                                <td className="py-2 pr-3 text-slate-700">{toTimeInputValue(wh.endTime)}</td>
                                                <td className="py-2 text-right">
                                                  <div className="inline-flex items-center gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => startEditingWorkingHours(row.staffId, wh)}
                                                      className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
                                                    >
                                                      <Pencil size={12} />
                                                      Edit
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => void deleteWorkingHours(row.staffId, wh.id)}
                                                      disabled={isSavingWorkingHours}
                                                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                      <Trash2 size={12} />
                                                      Delete
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-4">
                                      <select
                                        value={workingHoursDraft.dayOfWeek}
                                        onChange={(event) =>
                                          updateWorkingHoursDraft(row.staffId, 'dayOfWeek', event.target.value)
                                        }
                                        className="rounded border border-slate-300 px-2 py-2 text-xs"
                                      >
                                        {DAY_OF_WEEK_OPTIONS.map((day) => (
                                          <option key={day.value} value={day.value}>
                                            {day.label}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="time"
                                        value={workingHoursDraft.startTime}
                                        onChange={(event) =>
                                          updateWorkingHoursDraft(row.staffId, 'startTime', event.target.value)
                                        }
                                        className="rounded border border-slate-300 px-2 py-2 text-xs"
                                      />
                                      <input
                                        type="time"
                                        value={workingHoursDraft.endTime}
                                        onChange={(event) =>
                                          updateWorkingHoursDraft(row.staffId, 'endTime', event.target.value)
                                        }
                                        className="rounded border border-slate-300 px-2 py-2 text-xs"
                                      />
                                      <button
                                        type="button"
                                        disabled={isSavingWorkingHours}
                                        onClick={() => void saveWorkingHours(row.staffId)}
                                        className="inline-flex items-center justify-center rounded bg-[#0066A6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#00588f] disabled:opacity-50"
                                      >
                                        <Plus size={12} className="mr-1" />
                                        {editingWorkingHours ? 'Save edit' : 'Add'}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
          {activeStaffId != null && (
            <aside className="min-h-0 w-full max-w-md shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-xl">
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
