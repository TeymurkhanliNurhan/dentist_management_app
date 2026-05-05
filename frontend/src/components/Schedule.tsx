import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Header from './Header';
import { ClinicPortalShell } from './ClinicPortalShell';
import { useLocation, useNavigate } from 'react-router-dom';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  API_BASE_URL,
  appointmentService,
  dentistService,
  patientService,
  randevueService,
  toothTreatmentService,
  type ToothTreatment,
  type Appointment,
  type CreatePatientDto,
  type CreateRandevueDto,
  type Patient,
  type Randevue,
  type UpdateRandevueDto,
} from '../services/api';
import { DENTIST_PORTAL_MENU, DIRECTOR_PORTAL_MENU, isDirectorPortalNavActive } from '../lib/clinicPortalNav';

/** Visible schedule window (top->bottom): 08:00 ... 21:00 (end boundary 22:00). */
const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 22;
const VISIBLE_HOURS = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;
const DISPLAY_HOURS = Array.from({ length: VISIBLE_HOURS }, (_, i) => SCHEDULE_START_HOUR + i);
const HOUR_PX = 56;
const DAY_PX = VISIBLE_HOURS * HOUR_PX;

/** Distinct colours for weekly director view (one stable colour per dentist column order). */
const WEEKLY_DENTIST_HEX_COLORS = [
  '#7c3aed',
  '#059669',
  '#2563eb',
  '#c026d3',
  '#d97706',
  '#0d9488',
  '#dc2626',
  '#4f46e5',
  '#ca8a04',
  '#0ea5e9',
] as const;

function startOfWeekMonday(d: Date): Date {
  const c = new Date(d);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Backend `Working_hours.dayOfWeek`: Monday = 1 … Sunday = 7 (not JS `Date#getDay()`). */
function apiDayOfWeekFromDate(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function weekRangeIso(monday: Date): { from: string; to: string } {
  const from = new Date(monday);
  from.setHours(0, 0, 0, 0);
  const to = addDays(monday, 7);
  to.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function combineLocalDateAndTime(dateYmd: string, timeHm: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [hh, mm = '0'] = timeHm.split(':');
  return new Date(y, m - 1, d, Number(hh), Number(mm), 0, 0);
}

function parseLocalDateYmd(dateYmd: string): Date {
  return combineLocalDateAndTime(dateYmd, '00:00');
}

type AppointmentChoice = 'none' | 'new' | number;

function dayBoundsLocal(day: Date): { start: Date; next: Date } {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const next = new Date(start);
  next.setDate(next.getDate() + 1);
  return { start, next };
}

function overlapsLocalDay(start: Date, end: Date, day: Date): boolean {
  const { start: d0, next: d1 } = dayBoundsLocal(day);
  return start < d1 && end > d0;
}

/** Y-offset from top of column where 08:00 = 0 inside the visible window. */
function offsetMsFromScheduleStart(visibleStart: Date, t: Date): number {
  return t.getTime() - visibleStart.getTime();
}

/**
 * Visible rectangle(s) for the day clipped to the 08:00-22:00 schedule window.
 */
function layoutSegments(day: Date, start: Date, end: Date): { top: number; height: number }[] {
  const { start: midnight } = dayBoundsLocal(day);
  const visibleStart = new Date(midnight);
  visibleStart.setHours(SCHEDULE_START_HOUR, 0, 0, 0);
  const visibleEnd = new Date(midnight);
  visibleEnd.setHours(SCHEDULE_END_HOUR, 0, 0, 0);

  if (end <= visibleStart || start >= visibleEnd) return [];
  const visStart = start > visibleStart ? start : visibleStart;
  const visEnd = end < visibleEnd ? end : visibleEnd;
  if (visEnd <= visStart) return [];

  const totalMs = VISIBLE_HOURS * 3600000;
  const top = (offsetMsFromScheduleStart(visibleStart, visStart) / totalMs) * DAY_PX;
  const height = ((visEnd.getTime() - visStart.getTime()) / totalMs) * DAY_PX;
  return [{ top, height: Math.max(height, 20) }];
}

function formatHourLabel24(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatWorkingHourDay(dayOfWeek: number, locale: string): string {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) return String(dayOfWeek);
  const mondayUtc = new Date(Date.UTC(2024, 0, 1));
  mondayUtc.setUTCDate(mondayUtc.getUTCDate() + (dayOfWeek - 1));
  return mondayUtc.toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' });
}

function toHourMinute(value: string): string {
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? value;
}

const BACK_TO_BACK_MAX_GAP_MS = 60_000;

function isBackToBack(prevEnd: Date, nextStart: Date): boolean {
  const d = nextStart.getTime() - prevEnd.getTime();
  return d >= 0 && d <= BACK_TO_BACK_MAX_GAP_MS;
}

function localTimeHm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isWholeDayBlocking(start: Date, end: Date): boolean {
  const startAtMidnight =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      start.getSeconds() === 0;
  const sameDayEndAtLastMinute =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate() &&
      end.getHours() === 23 &&
      end.getMinutes() >= 59;
  const nextDayEndAtMidnight =
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getSeconds() === 0 &&
      addDays(new Date(start.getFullYear(), start.getMonth(), start.getDate()), 1).getTime() ===
      new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

  return startAtMidnight && (sameDayEndAtLastMinute || nextDayEndAtMidnight);
}

function formatBlockingRequestDateRange(start: Date, end: Date): string {
  const dateLabel = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(
      2,
      '0',
  )}.${start.getFullYear()}`;

  if (isWholeDayBlocking(start, end)) {
    return dateLabel;
  }

  const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
  if (sameDay) {
    return `${dateLabel} ${localTimeHm(start)}-${localTimeHm(end)}`;
  }

  const endDateLabel = `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(
      2,
      '0',
  )}.${end.getFullYear()}`;
  return `${dateLabel} ${localTimeHm(start)} - ${endDateLabel} ${localTimeHm(end)}`;
}

/** Display API date `YYYY-MM-DD` as `DD.MM.YYYY` for appointment pickers. */
function formatYmdDisplay(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!m) return ymd;
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}

function tooltipLeft(clientX: number): number {
  const pad = 14;
  const w = 280;
  let x = clientX + pad;
  if (typeof window !== 'undefined') {
    x = Math.min(x, window.innerWidth - w - 8);
    x = Math.max(8, x);
  }
  return x;
}

function tooltipTop(clientY: number): number {
  const pad = 14;
  let y = clientY + pad;
  if (typeof window !== 'undefined') {
    y = Math.min(y, window.innerHeight - 120);
    y = Math.max(8, y);
  }
  return y;
}

function toApiIsoLocalDayBounds(day: Date): { from: string; to: string } {
  const fromDate = new Date(day);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 1);
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

type IntervalLaneItem<T> = { item: T; start: Date; end: Date };

function buildOverlapLanes<T>(items: IntervalLaneItem<T>[]): Array<IntervalLaneItem<T> & { lane: number; laneCount: number }> {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());

  const clusters: IntervalLaneItem<T>[][] = [];
  let current: IntervalLaneItem<T>[] = [];
  let currentMaxEnd = 0;
  for (const it of sorted) {
    const s = it.start.getTime();
    const e = it.end.getTime();
    if (current.length === 0) {
      current = [it];
      currentMaxEnd = e;
      continue;
    }
    if (s < currentMaxEnd) {
      current.push(it);
      currentMaxEnd = Math.max(currentMaxEnd, e);
      continue;
    }
    clusters.push(current);
    current = [it];
    currentMaxEnd = e;
  }
  if (current.length) clusters.push(current);

  const out: Array<IntervalLaneItem<T> & { lane: number; laneCount: number }> = [];
  for (const cluster of clusters) {
    // Assign each interval to the first available lane (greedy).
    const lanesEnd: number[] = [];
    const assigned: Array<IntervalLaneItem<T> & { lane: number }> = [];
    for (const it of cluster) {
      const s = it.start.getTime();
      let lane = lanesEnd.findIndex((endMs) => endMs <= s);
      if (lane < 0) {
        lane = lanesEnd.length;
        lanesEnd.push(it.end.getTime());
      } else {
        lanesEnd[lane] = it.end.getTime();
      }
      assigned.push({ ...it, lane });
    }
    const laneCount = lanesEnd.length;
    for (const a of assigned) out.push({ ...a, laneCount });
  }
  return out;
}

type ScheduleViewMode = 'weekly' | 'dailyRooms' | 'dailyDentists' | 'dailyMine';

interface RoomColumn {
  id: number;
  number: string;
  description: string;
}

interface DentistColumn {
  id: number;
  staff?: {
    id?: number;
    name?: string;
    surname?: string;
  };
}

interface NurseColumn {
  id: number;
  staff?: {
    id?: number;
    name?: string;
    surname?: string;
  };
}

interface StaffSummary {
  name?: string;
  surname?: string;
}

interface WorkingHourRow {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  staffId: number;
  staff?: {
    id?: number;
    name?: string;
    surname?: string;
  } | null;
}

interface BlockingHourRow {
  id: number;
  startTime: string;
  endTime: string;
  staffId: number | null;
  roomId: number | null;
  name?: string | null;
  approvalStatus?: 'awaiting' | 'approved' | 'rejected' | 'canceled';
  staff?: {
    id?: number;
    name?: string;
    surname?: string;
  } | null;
}

function blockingStatusTone(status?: BlockingHourRow['approvalStatus']): string {
  if (status === 'approved') return 'bg-emerald-500/90 hover:bg-emerald-600/90';
  if (status === 'rejected') return 'bg-rose-500/90 hover:bg-rose-600/90';
  if (status === 'awaiting') return 'bg-amber-500/90 hover:bg-amber-600/90';
  return 'bg-slate-500/90 hover:bg-slate-600/90';
}

const SLOT_MINUTES = 30;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, i) => {
  const minutes = i * SLOT_MINUTES;
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
});

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function timeStringToMinutes(value: string): number {
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
}

const Schedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const { t, i18n } = useTranslation('schedule');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';
  const isReception = role === 'frontdesk';
  const isDirectorOrReception = isDirector || isReception;
  const isDentistUser = role === 'dentist';
  const useClinicScheduleUi = isDirectorOrReception || isDentistUser;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dentistPortalDisplayName, setDentistPortalDisplayName] = useState('');
  const [directorStaff, setDirectorStaff] = useState<StaffSummary | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [dayAnchor, setDayAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('weekly');
  const [randevues, setRandevues] = useState<Randevue[]>([]);
  const [rooms, setRooms] = useState<RoomColumn[]>([]);
  const [dentists, setDentists] = useState<DentistColumn[]>([]);
  const [nurses, setNurses] = useState<NurseColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formRoomId, setFormRoomId] = useState<number>(0);
  const [formDentistId, setFormDentistId] = useState<number>(0);
  const [formNurseId, setFormNurseId] = useState<number>(0);
  const [directorWorkingHours, setDirectorWorkingHours] = useState<WorkingHourRow[]>([]);
  const [directorBlockingHours, setDirectorBlockingHours] = useState<BlockingHourRow[]>([]);
  const [scheduleBlockingHours, setScheduleBlockingHours] = useState<BlockingHourRow[]>([]);
  const [createModalTab, setCreateModalTab] = useState<'randevue' | 'blocking'>('randevue');
  const [blockFormDate, setBlockFormDate] = useState('');
  const [blockFormStart, setBlockFormStart] = useState('09:00');
  const [blockFormEnd, setBlockFormEnd] = useState('10:00');
  const [blockFormName, setBlockFormName] = useState('');
  const [blockSubmitBusy, setBlockSubmitBusy] = useState(false);
  const [blockSubmitError, setBlockSubmitError] = useState<string | null>(null);
  const [blockingDetailId, setBlockingDetailId] = useState<number | null>(null);
  const [blockEditName, setBlockEditName] = useState('');
  const [blockEditDate, setBlockEditDate] = useState('');
  const [blockEditStart, setBlockEditStart] = useState('09:00');
  const [blockEditEnd, setBlockEditEnd] = useState('10:00');
  const [blockingDetailBusy, setBlockingDetailBusy] = useState(false);
  const [blockingDeleteBusy, setBlockingDeleteBusy] = useState(false);
  const [blockingDetailError, setBlockingDetailError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<number>(0);
  const [note, setNote] = useState('');
  const [openAppointments, setOpenAppointments] = useState<Appointment[]>([]);
  const [appointmentChoice, setAppointmentChoice] = useState<AppointmentChoice>('none');
  const [apptsLoading, setApptsLoading] = useState(false);
  const [appointmentTreatments, setAppointmentTreatments] = useState<ToothTreatment[]>([]);
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState<number[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);

  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState<CreatePatientDto>({ name: '', surname: '', birthDate: '' });
  const [patientFormBusy, setPatientFormBusy] = useState(false);
  const [patientFormMsg, setPatientFormMsg] = useState<string | null>(null);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('09:00');
  const [editEnd, setEditEnd] = useState('10:00');
  const [detailRoomId, setDetailRoomId] = useState(0);
  const [detailDentistId, setDetailDentistId] = useState(0);
  const [detailNurseId, setDetailNurseId] = useState(0);
  const [editPatientId, setEditPatientId] = useState(0);
  const [editNote, setEditNote] = useState('');
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailAppointmentChoice, setDetailAppointmentChoice] = useState<AppointmentChoice>('none');
  const [detailOpenAppointments, setDetailOpenAppointments] = useState<Appointment[]>([]);
  const [detailApptsLoading, setDetailApptsLoading] = useState(false);
  const [detailAppointmentTreatments, setDetailAppointmentTreatments] = useState<ToothTreatment[]>([]);
  const [detailSelectedTreatmentIds, setDetailSelectedTreatmentIds] = useState<number[]>([]);
  const [detailLoadingTreatments, setDetailLoadingTreatments] = useState(false);
  const [randevueDetailEditMode, setRandevueDetailEditMode] = useState(false);

  type ScheduleHoverTip =
      | { kind: 'randevue'; r: Randevue; clientX: number; clientY: number }
      | { kind: 'blocking'; bh: BlockingHourRow; clientX: number; clientY: number };

  const [hoverTip, setHoverTip] = useState<ScheduleHoverTip | null>(null);

  const [directorWeeklyVisibleDentistIds, setDirectorWeeklyVisibleDentistIds] = useState<Set<number>>(
      () => new Set(),
  );
  const [directorWeeklyShowRandevues, setDirectorWeeklyShowRandevues] = useState(true);
  const [directorWeeklyShowBlocking, setDirectorWeeklyShowBlocking] = useState(true);
  const [directorWeeklyFilterDentistsOpen, setDirectorWeeklyFilterDentistsOpen] = useState(false);
  const [directorWeeklyFilterTypesOpen, setDirectorWeeklyFilterTypesOpen] = useState(false);
  const directorWeeklyAllTypesCheckboxRef = useRef<HTMLInputElement>(null);
  const scheduleScrollRef = useRef<HTMLElement | null>(null);
  const weeklyScrollRestoreTopRef = useRef<number | null>(null);
  const [showDirectorRequests, setShowDirectorRequests] = useState(false);
  const [requestActionBusyId, setRequestActionBusyId] = useState<number | null>(null);
  const [workingHoursModalOpen, setWorkingHoursModalOpen] = useState(false);
  const [workingHoursRows, setWorkingHoursRows] = useState<WorkingHourRow[]>([]);
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false);
  const [workingHoursError, setWorkingHoursError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDirectorStaff = async () => {
      if (!isDirectorOrReception) {
        setDirectorStaff(null);
        return;
      }

      const staffIdRaw = localStorage.getItem('staffId');
      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) {
        setDirectorStaff(null);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/staff?id=${staffId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
        });
        if (!res.ok) throw new Error('Failed to load staff');
        const data = await res.json();
        const staff = Array.isArray(data) ? data[0] : data;
        setDirectorStaff({ name: staff?.name, surname: staff?.surname });
      } catch {
        setDirectorStaff(null);
      }
    };

    void fetchDirectorStaff();
  }, [isDirectorOrReception]);

  useEffect(() => {
    if (!isDentistUser) {
      setDentistPortalDisplayName('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      const raw = localStorage.getItem('dentistId');
      const id = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isFinite(id) || id <= 0) return;
      try {
        const profile = await dentistService.getById(id);
        const label = `${profile?.staff?.name ?? ''} ${profile?.staff?.surname ?? ''}`.trim();
        if (!cancelled) setDentistPortalDisplayName(label || `Dentist #${id}`);
      } catch {
        if (!cancelled) setDentistPortalDisplayName('');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isDentistUser]);

  useEffect(() => {
    const fetchDirectorAvailabilityData = async () => {
      const targetDateYmd =
          modalOpen && formDate ? formDate : detailId != null && editDate ? editDate : '';

      if (!useClinicScheduleUi || !targetDateYmd) {
        setDirectorWorkingHours([]);
        setDirectorBlockingHours([]);
        return;
      }

      const targetDate = parseLocalDateYmd(targetDateYmd);
      const dayOfWeek = apiDayOfWeekFromDate(targetDate);

      try {
        const [workingRes, blockingRes] = await Promise.all([
          fetch(`${API_BASE_URL}/working-hours?dayOfWeek=${dayOfWeek}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
          }),
          fetch(`${API_BASE_URL}/blocking-hours`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
          }),
        ]);

        const workingData = workingRes.ok ? ((await workingRes.json()) as WorkingHourRow[]) : [];
        const blockingData = blockingRes.ok ? ((await blockingRes.json()) as BlockingHourRow[]) : [];

        setDirectorWorkingHours(Array.isArray(workingData) ? workingData : []);
        setDirectorBlockingHours(Array.isArray(blockingData) ? blockingData : []);
      } catch {
        setDirectorWorkingHours([]);
        setDirectorBlockingHours([]);
      }
    };

    void fetchDirectorAvailabilityData();
  }, [detailId, editDate, formDate, modalOpen, useClinicScheduleUi]);

  const loggedInDentistId = useMemo(() => {
    const raw = localStorage.getItem('dentistId');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);

  const myStaffIdForSchedule = useMemo(() => {
    if (!loggedInDentistId) return null;
    return dentists.find((d) => d.id === loggedInDentistId)?.staff?.id ?? null;
  }, [dentists, loggedInDentistId]);

  useEffect(() => {
    if (!isDentistUser) return;
    if (viewMode === 'dailyRooms' || viewMode === 'dailyDentists') {
      setViewMode('dailyMine');
    }
  }, [isDentistUser, viewMode]);

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const rangeLabel = useMemo(() => {
    if (useClinicScheduleUi && viewMode !== 'weekly') {
      return dayAnchor.toLocaleDateString(i18n.language, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const a = days[0];
    const b = days[6];
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const y = a.getFullYear() !== b.getFullYear();
    const left = a.toLocaleDateString(i18n.language, y ? { ...opts, year: 'numeric' } : opts);
    const right = b.toLocaleDateString(i18n.language, { ...opts, year: 'numeric' });
    return `${left} – ${right}`;
  }, [dayAnchor, days, i18n.language, useClinicScheduleUi, viewMode]);

  const randevueShadeByDayAndId = useMemo(() => {
    if (useClinicScheduleUi) return new Map<string, 0 | 1>();
    const map = new Map<string, 0 | 1>();
    for (const day of days) {
      const items: { r: Randevue; s: Date; e: Date }[] = [];
      for (const r of randevues) {
        const s = new Date(r.date);
        const e = new Date(r.endTime);
        if (layoutSegments(day, s, e).length > 0) items.push({ r, s, e });
      }
      items.sort((a, b) => a.s.getTime() - b.s.getTime());
      let shade: 0 | 1 = 0;
      let prevEnd: Date | null = null;
      for (const { r, s, e } of items) {
        if (prevEnd && isBackToBack(prevEnd, s)) {
          shade = shade === 0 ? 1 : 0;
        } else {
          shade = 0;
        }
        map.set(`${day.getTime()}-${r.id}`, shade);
        prevEnd = e;
      }
    }
    return map;
  }, [days, randevues, useClinicScheduleUi]);

  const fetchSchedule = useCallback(async () => {
    if (isDirectorOrReception && viewMode === 'weekly' && scheduleScrollRef.current) {
      weeklyScrollRestoreTopRef.current = scheduleScrollRef.current.scrollTop;
    }
    setLoading(true);
    setLoadError(null);
    try {
      if (!useClinicScheduleUi) {
        const range = weekRangeIso(weekAnchor);
        const randevueData = await randevueService.getForRange(range.from, range.to);
        setRandevues(randevueData);
        setRooms([]);
        setDentists([]);
        setNurses([]);
        setScheduleBlockingHours([]);
      } else {
        const range =
            viewMode === 'weekly' ? weekRangeIso(weekAnchor) : toApiIsoLocalDayBounds(dayAnchor);

        const token = localStorage.getItem('access_token') || '';
        const [randevueData, roomsRes, dentistsRes, nursesRes, blockingRes] = await Promise.all([
          randevueService.getForRange(range.from, range.to),
          fetch(`${API_BASE_URL}/room`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/dentist`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/nurse`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/blocking-hours`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const roomsData = roomsRes.ok ? ((await roomsRes.json()) as RoomColumn[]) : [];
        const dentistsData = dentistsRes.ok ? ((await dentistsRes.json()) as DentistColumn[]) : [];
        const nursesData = nursesRes.ok ? ((await nursesRes.json()) as NurseColumn[]) : [];
        const blockingData = blockingRes.ok ? ((await blockingRes.json()) as BlockingHourRow[]) : [];

        setRandevues(randevueData);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setDentists(Array.isArray(dentistsData) ? dentistsData : []);
        setNurses(Array.isArray(nursesData) ? nursesData : []);
        setScheduleBlockingHours(Array.isArray(blockingData) ? blockingData : []);
      }
    } catch {
      setLoadError(t('loadError'));
      setRandevues([]);
      setRooms([]);
      setDentists([]);
      setNurses([]);
      setScheduleBlockingHours([]);
    } finally {
      setLoading(false);
    }
  }, [dayAnchor, isDirectorOrReception, t, useClinicScheduleUi, viewMode, weekAnchor]);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    const clearHoverTip = () => setHoverTip(null);
    window.addEventListener('scroll', clearHoverTip, true);
    return () => window.removeEventListener('scroll', clearHoverTip, true);
  }, []);

  useEffect(() => {
    if (loading) setHoverTip(null);
  }, [loading]);

  useEffect(() => {
    if (loading || !isDirectorOrReception || viewMode !== 'weekly') return;
    const top = weeklyScrollRestoreTopRef.current;
    if (top == null) return;

    // Keep weekly scroll position stable after async schedule refreshes.
    requestAnimationFrame(() => {
      if (scheduleScrollRef.current) {
        scheduleScrollRef.current.scrollTop = top;
      }
      weeklyScrollRestoreTopRef.current = null;
    });
  }, [isDirectorOrReception, loading, randevues, viewMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setHoverTip(null);
      if (modalOpen) setModalOpen(false);
      else if (blockingDetailId != null) setBlockingDetailId(null);
      else if (detailId != null) {
        setDetailId(null);
        setRandevueDetailEditMode(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [blockingDetailId, detailId, modalOpen]);

  const syncDetailFormFromRandevue = useCallback((r: Randevue) => {
    const s = new Date(r.date);
    const e = new Date(r.endTime);
    setEditDate(formatYmd(s));
    setEditStart(localTimeHm(s));
    setEditEnd(localTimeHm(e));
    setDetailRoomId(r.room?.id ?? 0);
    setDetailDentistId(r.dentist?.id ?? 0);
    setDetailNurseId(r.nurse?.id ?? 0);
    setEditPatientId(r.patient.id);
    setEditNote(r.note ?? '');
    const appt = r.appointment;
    const apptOpen = Boolean(appt && (appt.endDate == null || appt.endDate === ''));
    setDetailAppointmentChoice(apptOpen && appt ? appt.id : 'none');
    setDetailError(null);
  }, []);

  useEffect(() => {
    if (detailId == null) return;
    const r = randevues.find((x) => x.id === detailId);
    if (!r) return;
    syncDetailFormFromRandevue(r);
  }, [detailId, randevues, syncDetailFormFromRandevue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await patientService.getAll();
        if (!cancelled) setPatients(list);
      } catch {
        if (!cancelled) setPatients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!patientId) {
      setOpenAppointments([]);
      setAppointmentChoice('none');
      return;
    }
    let cancelled = false;
    (async () => {
      setApptsLoading(true);
      try {
        const res = await appointmentService.getAll({ patient: patientId, limit: 200, page: 1 });
        const open = res.appointments.filter((a) => a.endDate == null);
        if (!cancelled) {
          setOpenAppointments(open);
          setAppointmentChoice((prev) => {
            if (prev === 'none' || prev === 'new') return prev;
            return open.some((a) => a.id === prev) ? prev : 'none';
          });
        }
      } catch {
        if (!cancelled) setOpenAppointments([]);
      } finally {
        if (!cancelled) setApptsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  useEffect(() => {
    if (detailId == null || !editPatientId) {
      setDetailOpenAppointments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailApptsLoading(true);
      try {
        const res = await appointmentService.getAll({ patient: editPatientId, limit: 200, page: 1 });
        const open = res.appointments.filter((a) => a.endDate == null);
        if (!cancelled) {
          setDetailOpenAppointments(open);
          setDetailAppointmentChoice((prev) => {
            if (prev === 'none' || prev === 'new') return prev;
            if (open.some((a) => a.id === prev)) return prev;
            return 'none';
          });
        }
      } catch {
        if (!cancelled) setDetailOpenAppointments([]);
      } finally {
        if (!cancelled) setDetailApptsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId, editPatientId, randevues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof appointmentChoice !== 'number') {
        setAppointmentTreatments([]);
        setSelectedTreatmentIds([]);
        return;
      }
      setLoadingTreatments(true);
      try {
        const treatments = await toothTreatmentService.getAll({ appointment: appointmentChoice });
        if (!cancelled) {
          setAppointmentTreatments(treatments);
          setSelectedTreatmentIds([]);
        }
      } catch {
        if (!cancelled) setAppointmentTreatments([]);
      } finally {
        if (!cancelled) setLoadingTreatments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentChoice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof detailAppointmentChoice !== 'number') {
        setDetailAppointmentTreatments([]);
        setDetailSelectedTreatmentIds([]);
        return;
      }
      setDetailLoadingTreatments(true);
      try {
        const treatments = await toothTreatmentService.getAll({ appointment: detailAppointmentChoice });
        if (!cancelled) {
          setDetailAppointmentTreatments(treatments);
          // Auto-select treatments that are already linked to this randevue
          const initiallySelected = treatments
            .filter((t) => t.linkedRandevues?.some((r) => r.id === detailId))
            .map((t) => t.id);
          setDetailSelectedTreatmentIds(initiallySelected);
        }
      } catch {
        if (!cancelled) setDetailAppointmentTreatments([]);
      } finally {
        if (!cancelled) setDetailLoadingTreatments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailAppointmentChoice, detailId]);

  const openNewModal = (day?: Date, hour?: number, initialTab: 'randevue' | 'blocking' = 'randevue') => {
    setDetailId(null);
    setRandevueDetailEditMode(false);
    const baseDay = day ?? new Date();
    const startHm = hour != null ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    const endHm = hour != null ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '10:00';
    setFormDate(formatYmd(baseDay));
    setFormStart(startHm);
    setFormEnd(endHm);
    setNote('');
    setPatientId(0);
    setAppointmentChoice('none');
    setAppointmentTreatments([]);
    setSelectedTreatmentIds([]);
    setFormRoomId(0);
    setFormDentistId(0);
    const myDid = Number(localStorage.getItem('dentistId'));
    if (isDentistUser && Number.isFinite(myDid) && myDid > 0) {
      setFormDentistId(myDid);
    }
    setFormNurseId(0);
    setShowNewPatient(false);
    setNewPatient({ name: '', surname: '', birthDate: '' });
    setPatientFormMsg(null);
    setSubmitError(null);
    const tab: 'randevue' | 'blocking' =
        isDentistUser || isDirectorOrReception ? initialTab : 'randevue';
    setCreateModalTab(tab);
    if (tab === 'blocking') {
      setBlockFormDate(formatYmd(baseDay));
      setBlockFormStart(startHm);
      setBlockFormEnd(endHm);
      setBlockFormName('');
      setBlockSubmitError(null);
    }
    setModalOpen(true);
  };

  const handleCreatePatient = async () => {
    setPatientFormBusy(true);
    setPatientFormMsg(null);
    try {
      const p = await patientService.create(newPatient);
      setPatients((prev) => [...prev, p].sort((a, b) => a.surname.localeCompare(b.surname)));
      setPatientId(p.id);
      setShowNewPatient(false);
      setNewPatient({ name: '', surname: '', birthDate: '' });
      setPatientFormMsg(t('patientCreated'));
    } catch {
      setPatientFormMsg('Error');
    } finally {
      setPatientFormBusy(false);
    }
  };

  const handleSubmitRandevue = async () => {
    setSubmitError(null);
    if (!patientId) {
      setSubmitError(t('pickPatientError'));
      return;
    }
    const start = combineLocalDateAndTime(formDate, formStart);
    const end = combineLocalDateAndTime(formDate, formEnd);
    if (end <= start) {
      setSubmitError(t('timeOrderError'));
      return;
    }

    const body: CreateRandevueDto = {
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      patient_id: patientId,
    };
    if (note.trim()) body.note = note.trim();
    if (useClinicScheduleUi && formRoomId > 0) body.room_id = formRoomId;
    if (isDentistUser) {
      const myDid = Number(localStorage.getItem('dentistId'));
      if (myDid > 0) body.dentist_id = myDid;
    } else if (useClinicScheduleUi && formDentistId > 0) {
      body.dentist_id = formDentistId;
    }
    if ((isDirector || isDentistUser) && formNurseId > 0) body.nurse_id = formNurseId;

    if (appointmentChoice === 'new') {
      body.create_new_appointment = true;
      body.appointment_start_date = formDate;
    } else if (typeof appointmentChoice === 'number') {
      body.appointment_id = appointmentChoice;
    }

    if (selectedTreatmentIds.length > 0) {
      body.tooth_treatment_ids = selectedTreatmentIds;
    }

    setSubmitBusy(true);
    try {
      await randevueService.create(body);
      setModalOpen(false);
      void fetchSchedule();
    } catch {
      setSubmitError(t('createError'));
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleSubmitBlocking = async () => {
    setBlockSubmitError(null);
    const start = combineLocalDateAndTime(blockFormDate, blockFormStart);
    const end = combineLocalDateAndTime(blockFormDate, blockFormEnd);
    if (end <= start) {
      setBlockSubmitError(t('timeOrderError'));
      return;
    }
    if (!isDentistUser && !isDirectorOrReception) return;
    setBlockSubmitBusy(true);
    try {
      const body: Record<string, unknown> = {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };
      if (isDirectorOrReception) {
        const selectedDentistStaffId =
            formDentistId > 0 ? dentistStaffIdByDentistId.get(formDentistId) : undefined;
        if (selectedDentistStaffId) {
          body.staffId = selectedDentistStaffId;
        }
      }
      const trimmedName = blockFormName.trim();
      if (trimmedName) body.name = trimmedName.slice(0, 127);
      const res = await fetch(`${API_BASE_URL}/blocking-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('blocking');
      setModalOpen(false);
      void fetchSchedule();
    } catch {
      setBlockSubmitError(t('blockingCreateError'));
    } finally {
      setBlockSubmitBusy(false);
    }
  };

  const openRandevueDetail = (r: Randevue) => {
    setBlockingDetailId(null);
    setRandevueDetailEditMode(false);
    setDetailId(r.id);
    setModalOpen(false);
  };

  const blockingDetailRow =
      blockingDetailId != null ? scheduleBlockingHours.find((x) => x.id === blockingDetailId) : undefined;

  const openBlockingDetail = (bh: BlockingHourRow) => {
    if (!isDentistUser && !isDirectorOrReception) return;
    setDetailId(null);
    setRandevueDetailEditMode(false);
    setModalOpen(false);
    setBlockingDetailId(bh.id);
    setBlockEditName(bh.name?.trim() ?? '');
    setBlockEditDate(formatYmd(new Date(bh.startTime)));
    setBlockEditStart(localTimeHm(new Date(bh.startTime)));
    setBlockEditEnd(localTimeHm(new Date(bh.endTime)));
    setBlockingDetailError(null);
  };

  const handleSaveBlockingDetail = async () => {
    if (blockingDetailId == null) return;
    setBlockingDetailError(null);
    const start = combineLocalDateAndTime(blockEditDate, blockEditStart);
    const end = combineLocalDateAndTime(blockEditDate, blockEditEnd);
    if (end <= start) {
      setBlockingDetailError(t('timeOrderError'));
      return;
    }
    setBlockingDetailBusy(true);
    try {
      const trimmed = blockEditName.trim();
      const res = await fetch(`${API_BASE_URL}/blocking-hours/${blockingDetailId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          name: trimmed === '' ? null : trimmed.slice(0, 127),
        }),
      });
      if (!res.ok) throw new Error('blocking patch');
      setBlockingDetailId(null);
      void fetchSchedule();
    } catch {
      setBlockingDetailError(t('blockingUpdateError'));
    } finally {
      setBlockingDetailBusy(false);
    }
  };

  const handleApproveBlockingDetail = async () => {
    if (blockingDetailId == null || !isDirectorOrReception) return;
    setBlockingDetailError(null);
    setBlockingDetailBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/blocking-hours/${blockingDetailId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (!res.ok) throw new Error('blocking approve');
      setBlockingDetailId(null);
      void fetchSchedule();
    } catch {
      setBlockingDetailError(t('blockingUpdateError'));
    } finally {
      setBlockingDetailBusy(false);
    }
  };

  const handleRejectBlockingDetail = async () => {
    if (blockingDetailId == null || !isDirectorOrReception) return;
    setBlockingDetailError(null);
    setBlockingDetailBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/blocking-hours/${blockingDetailId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (!res.ok) throw new Error('blocking reject');
      setBlockingDetailId(null);
      void fetchSchedule();
    } catch {
      setBlockingDetailError(t('blockingUpdateError'));
    } finally {
      setBlockingDetailBusy(false);
    }
  };

  const handleCancelBlockingDetail = async () => {
    if (blockingDetailId == null || !isDentistUser) return;
    setBlockingDetailError(null);
    setBlockingDeleteBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/blocking-hours/${blockingDetailId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (!res.ok) throw new Error('blocking cancel');
      setBlockingDetailId(null);
      void fetchSchedule();
    } catch {
      setBlockingDetailError(t('blockingDeleteError'));
    } finally {
      setBlockingDeleteBusy(false);
    }
  };

  const handleSaveDetail = async () => {
    if (detailId == null) return;
    setDetailError(null);
    if (!editPatientId) {
      setDetailError(t('pickPatientError'));
      return;
    }
    const start = combineLocalDateAndTime(editDate, editStart);
    const end = combineLocalDateAndTime(editDate, editEnd);
    if (end <= start) {
      setDetailError(t('timeOrderError'));
      return;
    }
    const hadLink = detailRandevue?.appointment != null;
    const linkedId = detailRandevue?.appointment?.id ?? null;
    const linkedEnd = detailRandevue?.appointment?.endDate ?? null;
    const linkWasClosed =
        hadLink && linkedEnd != null && String(linkedEnd).trim() !== '';

    const body: UpdateRandevueDto = {
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      patient_id: editPatientId,
      note: editNote,
    };
    if (useClinicScheduleUi && detailRoomId > 0) body.room_id = detailRoomId;
    if (isDentistUser) {
      const myDid = Number(localStorage.getItem('dentistId'));
      if (myDid > 0) body.dentist_id = myDid;
    } else if (useClinicScheduleUi && detailDentistId > 0) {
      body.dentist_id = detailDentistId;
    }
    if (isDirector || isDentistUser) {
      if (detailNurseId > 0) body.nurse_id = detailNurseId;
      else if (detailRandevue?.nurse?.id) body.clear_nurse = true;
    }

    if (detailAppointmentChoice === 'new') {
      body.create_new_appointment = true;
      body.appointment_start_date = editDate;
    } else if (typeof detailAppointmentChoice === 'number') {
      if (detailAppointmentChoice !== linkedId) {
        body.appointment_id = detailAppointmentChoice;
      }
    } else if (hadLink && !linkWasClosed) {
      body.clear_appointment = true;
    }

    const initiallySelected = detailAppointmentTreatments
      .filter((t) => t.linkedRandevues?.some((r) => r.id === detailId))
      .map((t) => t.id);
    
    const appendIds = detailSelectedTreatmentIds.filter((id) => !initiallySelected.includes(id));
    const removeIds = initiallySelected.filter((id) => !detailSelectedTreatmentIds.includes(id));

    if (appendIds.length > 0) body.append_tooth_treatment_ids = appendIds;
    if (removeIds.length > 0) body.remove_tooth_treatment_ids = removeIds;

    setDetailBusy(true);
    try {
      await randevueService.update(detailId, body);
      setRandevueDetailEditMode(false);
      void fetchSchedule();
    } catch {
      setDetailError(t('updateError'));
    } finally {
      setDetailBusy(false);
    }
  };

  const detailRandevue = detailId != null ? randevues.find((x) => x.id === detailId) : undefined;

  const dentistSurnameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of dentists) {
      if (d.id && d.staff?.surname) map.set(d.id, d.staff.surname);
    }
    return map;
  }, [dentists]);

  const blockingStaffLabel = useMemo(() => {
    if (isDirectorOrReception) {
      const selected = dentists.find((x) => x.id === formDentistId);
      if (!selected?.staff) return '';
      return `${selected.staff.name ?? ''} ${selected.staff.surname ?? ''}`.trim();
    }
    const id = Number(localStorage.getItem('dentistId'));
    const d = dentists.find((x) => x.id === id);
    if (!d?.staff) return '';
    return `${d.staff.name ?? ''} ${d.staff.surname ?? ''}`.trim();
  }, [dentists, formDentistId, isDirectorOrReception]);

  const dentistDisplayNameByStaffId = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of dentists) {
      const sid = d.staff?.id;
      if (!sid) continue;
      const fullName = `${d.staff?.name ?? ''} ${d.staff?.surname ?? ''}`.trim();
      if (fullName) map.set(sid, fullName);
    }
    return map;
  }, [dentists]);

  const awaitingBlockingRequests = useMemo(
      () =>
          scheduleBlockingHours
              .filter((bh) => bh.approvalStatus === 'awaiting')
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      [scheduleBlockingHours],
  );

  const awaitingBlockingCount = awaitingBlockingRequests.length;

  const roomTitleById = useMemo(() => {
    const map = new Map<number, string>();
    for (const room of rooms) {
      const label = room.number ? `Room ${room.number}` : room.description || `Room #${room.id}`;
      map.set(room.id, label);
    }
    return map;
  }, [rooms]);

  const dentistStaffIdByDentistId = useMemo(() => {
    const map = new Map<number, number>();
    for (const dentist of dentists) {
      if (dentist.id && dentist.staff?.id) map.set(dentist.id, dentist.staff.id);
    }
    return map;
  }, [dentists]);

  const nurseStaffIdByNurseId = useMemo(() => {
    const map = new Map<number, number>();
    for (const nurse of nurses) {
      if (nurse.id && nurse.staff?.id) map.set(nurse.id, nurse.staff.id);
    }
    return map;
  }, [nurses]);

  const dentistByStaffIdForSchedule = useMemo(() => {
    const map = new Map<number, DentistColumn>();
    for (const d of dentists) {
      const sid = d.staff?.id;
      if (sid != null && Number.isFinite(sid)) map.set(sid, d);
    }
    return map;
  }, [dentists]);

  const dentistWeeklyHexByDentistId = useMemo(() => {
    const map = new Map<number, string>();
    dentists.forEach((d, idx) => {
      map.set(d.id, WEEKLY_DENTIST_HEX_COLORS[idx % WEEKLY_DENTIST_HEX_COLORS.length]);
    });
    return map;
  }, [dentists]);

  const dentistFullNameByDentistId = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of dentists) {
      const label = `${d.staff?.name ?? ''} ${d.staff?.surname ?? ''}`.trim();
      map.set(d.id, label || t('dentistUnknown'));
    }
    return map;
  }, [dentists, t]);

  const nurseFullNameByNurseId = useMemo(() => {
    const map = new Map<number, string>();
    for (const n of nurses) {
      const label = `${n.staff?.name ?? ''} ${n.staff?.surname ?? ''}`.trim();
      map.set(n.id, label || t('nurse'));
    }
    return map;
  }, [nurses, t]);

  const randevuesForClinicGrid = useMemo(() => {
    if (!useClinicScheduleUi) return randevues;
    if (!isDirectorOrReception || viewMode !== 'weekly') return randevues;
    if (!directorWeeklyShowRandevues) return [];
    return randevues.filter((r) => {
      const did = r.dentist?.id;
      if (did == null) return true;
      return directorWeeklyVisibleDentistIds.has(did);
    });
  }, [
    directorWeeklyShowRandevues,
    directorWeeklyVisibleDentistIds,
    isDirectorOrReception,
    randevues,
    useClinicScheduleUi,
    viewMode,
  ]);

  useEffect(() => {
    if (!isDirectorOrReception) return;
    const ids = dentists.map((d) => d.id).filter((id) => Number.isFinite(id) && id > 0);
    setDirectorWeeklyVisibleDentistIds((prev) => {
      if (ids.length === 0) return new Set();
      if (prev.size === 0) return new Set(ids);
      const next = new Set<number>();
      for (const id of ids) {
        if (prev.has(id)) next.add(id);
      }
      for (const id of ids) {
        if (!prev.has(id)) next.add(id);
      }
      return next;
    });
  }, [dentists, isDirectorOrReception]);

  useLayoutEffect(() => {
    const el = directorWeeklyAllTypesCheckboxRef.current;
    if (!el) return;
    const both = directorWeeklyShowRandevues && directorWeeklyShowBlocking;
    const none = !directorWeeklyShowRandevues && !directorWeeklyShowBlocking;
    el.indeterminate = !both && !none;
  }, [directorWeeklyShowRandevues, directorWeeklyShowBlocking]);

  const weeklyColumns = days.map((day) => ({
    key: day.toISOString(),
    label: day.toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    day,
    isToday: formatYmd(day) === formatYmd(new Date()),
  }));

  const roomColumns = rooms.map((room) => ({
    key: `room-${room.id}`,
    label: room.number ? `Room ${room.number}` : room.description || `Room #${room.id}`,
    roomId: room.id,
  }));

  const dentistColumns = dentists.map((dentist) => ({
    key: `dentist-${dentist.id}`,
    label: `Dr. ${dentist.staff?.surname || '#' + dentist.id}`,
    dentistId: dentist.id,
  }));

  const dentistMineColumns = useMemo(() => {
    if (!loggedInDentistId) return [];
    const d = dentists.find((x) => x.id === loggedInDentistId);
    if (!d) return [];
    return [{ key: `mine-${d.id}`, label: t('viewDailyMine'), dentistId: d.id }];
  }, [dentists, loggedInDentistId, t]);

  const activeColumns =
      viewMode === 'weekly'
          ? weeklyColumns
          : viewMode === 'dailyRooms'
              ? roomColumns
              : viewMode === 'dailyMine'
                  ? dentistMineColumns
                  : dentistColumns;

  const intervalOverlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
      aStart < bEnd && aEnd > bStart;

  const staffHasOverlappingRandevue = useCallback(
      (
          staffId: number,
          dateYmd: string,
          startHm: string,
          endHm: string,
          options?: { excludeRandevueId?: number },
      ) => {
        const intervalStart = combineLocalDateAndTime(dateYmd, startHm);
        const intervalEnd = combineLocalDateAndTime(dateYmd, endHm);

        return randevues.some((r) => {
          if (options?.excludeRandevueId != null && r.id === options.excludeRandevueId) {
            return false;
          }

          const dentistStaffId =
              r.dentist?.id != null ? dentistStaffIdByDentistId.get(r.dentist.id) : undefined;
          const nurseStaffId =
              r.nurse?.id != null ? nurseStaffIdByNurseId.get(r.nurse.id) : undefined;

          if (dentistStaffId !== staffId && nurseStaffId !== staffId) {
            return false;
          }

          return intervalOverlaps(
              intervalStart,
              intervalEnd,
              new Date(r.date),
              new Date(r.endTime),
          );
        });
      },
      [dentistStaffIdByDentistId, nurseStaffIdByNurseId, randevues],
  );

  const staffAvailableAt = useCallback(
      (
          staffId: number,
          dateYmd: string,
          startHm: string,
          endHm: string,
          options?: { excludeRandevueId?: number },
      ) => {
        const intervalStart = combineLocalDateAndTime(dateYmd, startHm);
        const intervalEnd = combineLocalDateAndTime(dateYmd, endHm);
        if (intervalEnd <= intervalStart) return false;

        const dayOfWeek = apiDayOfWeekFromDate(intervalStart);
        const startMinutes = hmToMinutes(startHm);
        const endMinutes = hmToMinutes(endHm);

        const hasWorkingWindow = directorWorkingHours.some((wh) => {
          if (wh.staffId !== staffId || wh.dayOfWeek !== dayOfWeek) return false;
          const whStart = timeStringToMinutes(wh.startTime);
          const whEnd = timeStringToMinutes(wh.endTime);
          return startMinutes >= whStart && endMinutes <= whEnd;
        });
        if (!hasWorkingWindow) return false;

        if (
            staffHasOverlappingRandevue(staffId, dateYmd, startHm, endHm, {
              excludeRandevueId: options?.excludeRandevueId,
            })
        ) {
          return false;
        }

        const hasBlocking = directorBlockingHours.some((bh) => {
          if (bh.staffId !== staffId) return false;
          return intervalOverlaps(
              intervalStart,
              intervalEnd,
              new Date(bh.startTime),
              new Date(bh.endTime),
          );
        });
        return !hasBlocking;
      },
      [directorBlockingHours, directorWorkingHours, staffHasOverlappingRandevue],
  );

  const roomAvailableAt = useCallback(
      (
          roomId: number,
          dateYmd: string,
          startHm: string,
          endHm: string,
          options?: { excludeRandevueId?: number },
      ) => {
        const intervalStart = combineLocalDateAndTime(dateYmd, startHm);
        const intervalEnd = combineLocalDateAndTime(dateYmd, endHm);
        if (intervalEnd <= intervalStart) return false;

        const hasBlocking = directorBlockingHours.some((bh) => {
          if (bh.roomId !== roomId) return false;
          return intervalOverlaps(
              intervalStart,
              intervalEnd,
              new Date(bh.startTime),
              new Date(bh.endTime),
          );
        });
        if (hasBlocking) return false;

        const roomHasRandevue = randevues.some((r) => {
          if (r.room?.id !== roomId) return false;
          if (options?.excludeRandevueId != null && r.id === options.excludeRandevueId) {
            return false;
          }
          return intervalOverlaps(
              intervalStart,
              intervalEnd,
              new Date(r.date),
              new Date(r.endTime),
          );
        });
        return !roomHasRandevue;
      },
      [directorBlockingHours, randevues],
  );

  const availableDentists = useMemo(() => {
    if (!useClinicScheduleUi || !formDate) return dentists;
    return dentists.filter((d) => {
      const staffId = d.staff?.id;
      if (!staffId) return false;
      return staffAvailableAt(staffId, formDate, formStart, formEnd);
    });
  }, [dentists, formDate, formEnd, formStart, staffAvailableAt, useClinicScheduleUi]);

  const availableNurses = useMemo(() => {
    if (!useClinicScheduleUi || !formDate) return nurses;
    return nurses.filter((n) => {
      const staffId = n.staff?.id;
      if (!staffId) return false;
      return staffAvailableAt(staffId, formDate, formStart, formEnd);
    });
  }, [formDate, formEnd, formStart, nurses, staffAvailableAt, useClinicScheduleUi]);

  const availableRooms = useMemo(() => {
    if (!useClinicScheduleUi || !formDate) return rooms;
    return rooms.filter((r) => roomAvailableAt(r.id, formDate, formStart, formEnd));
  }, [formDate, formEnd, formStart, roomAvailableAt, rooms, useClinicScheduleUi]);

  const intervalAllowedByCurrentSelections = useCallback(
      (dateYmd: string, startHm: string, endHm: string) => {
        if (!useClinicScheduleUi) return true;
        if (formDentistId > 0) {
          const d = dentists.find((x) => x.id === formDentistId);
          if (!d?.staff?.id || !staffAvailableAt(d.staff.id, dateYmd, startHm, endHm)) return false;
        }
        if (formNurseId > 0) {
          const n = nurses.find((x) => x.id === formNurseId);
          if (!n?.staff?.id || !staffAvailableAt(n.staff.id, dateYmd, startHm, endHm)) return false;
        }
        if (formRoomId > 0 && !roomAvailableAt(formRoomId, dateYmd, startHm, endHm)) return false;
        return true;
      },
      [
        dentists,
        formDentistId,
        formNurseId,
        formRoomId,
        nurses,
        roomAvailableAt,
        staffAvailableAt,
        useClinicScheduleUi,
      ],
  );

  const availableStartTimes = useMemo(() => {
    if (!useClinicScheduleUi || !formDate) return TIME_OPTIONS;
    return TIME_OPTIONS.filter((startHm) =>
        TIME_OPTIONS.some(
            (endHm) =>
                hmToMinutes(endHm) > hmToMinutes(startHm) &&
                intervalAllowedByCurrentSelections(formDate, startHm, endHm),
        ),
    );
  }, [formDate, intervalAllowedByCurrentSelections, useClinicScheduleUi]);

  const availableEndTimes = useMemo(() => {
    if (!useClinicScheduleUi || !formDate)
      return TIME_OPTIONS.filter((x) => hmToMinutes(x) > hmToMinutes(formStart));
    return TIME_OPTIONS.filter(
        (endHm) =>
            hmToMinutes(endHm) > hmToMinutes(formStart) &&
            intervalAllowedByCurrentSelections(formDate, formStart, endHm),
    );
  }, [formDate, formStart, intervalAllowedByCurrentSelections, useClinicScheduleUi]);

  const detailIntervalAllowedBySelections = useCallback(
      (dateYmd: string, startHm: string, endHm: string) => {
        if (!useClinicScheduleUi) return true;
        if (detailDentistId > 0) {
          const d = dentists.find((x) => x.id === detailDentistId);
          if (!d?.staff?.id || !staffAvailableAt(d.staff.id, dateYmd, startHm, endHm)) return false;
        }
        if (detailNurseId > 0) {
          const n = nurses.find((x) => x.id === detailNurseId);
          if (!n?.staff?.id || !staffAvailableAt(n.staff.id, dateYmd, startHm, endHm)) return false;
        }
        if (
            detailRoomId > 0 &&
            !roomAvailableAt(detailRoomId, dateYmd, startHm, endHm, {
              excludeRandevueId: detailId ?? undefined,
            })
        ) {
          return false;
        }
        return true;
      },
      [
        dentists,
        detailDentistId,
        detailId,
        detailNurseId,
        detailRoomId,
        nurses,
        roomAvailableAt,
        staffAvailableAt,
        useClinicScheduleUi,
      ],
  );

  const detailAvailableDentists = useMemo(() => {
    if (!useClinicScheduleUi || !editDate) return dentists;
    return dentists.filter((d) => {
      const staffId = d.staff?.id;
      if (!staffId) return false;
      return staffAvailableAt(staffId, editDate, editStart, editEnd, {
        excludeRandevueId: detailId ?? undefined,
      });
    });
  }, [dentists, detailId, editDate, editEnd, editStart, staffAvailableAt, useClinicScheduleUi]);

  const detailAvailableNurses = useMemo(() => {
    if (!useClinicScheduleUi || !editDate) return nurses;
    return nurses.filter((n) => {
      const staffId = n.staff?.id;
      if (!staffId) return false;
      return staffAvailableAt(staffId, editDate, editStart, editEnd, {
        excludeRandevueId: detailId ?? undefined,
      });
    });
  }, [detailId, editDate, editEnd, editStart, nurses, staffAvailableAt, useClinicScheduleUi]);

  const detailAvailableRooms = useMemo(() => {
    if (!useClinicScheduleUi || !editDate) return rooms;
    return rooms.filter((r) =>
        roomAvailableAt(r.id, editDate, editStart, editEnd, {
          excludeRandevueId: detailId ?? undefined,
        }),
    );
  }, [detailId, editDate, editEnd, editStart, roomAvailableAt, rooms, useClinicScheduleUi]);

  const detailDentistOptions = useMemo(() => {
    if (detailDentistId <= 0) return detailAvailableDentists;
    if (detailAvailableDentists.some((d) => d.id === detailDentistId)) return detailAvailableDentists;
    const selected = dentists.find((d) => d.id === detailDentistId);
    return selected ? [selected, ...detailAvailableDentists] : detailAvailableDentists;
  }, [dentists, detailAvailableDentists, detailDentistId]);

  const detailNurseOptions = useMemo(() => {
    if (detailNurseId <= 0) return detailAvailableNurses;
    if (detailAvailableNurses.some((n) => n.id === detailNurseId)) return detailAvailableNurses;
    const selected = nurses.find((n) => n.id === detailNurseId);
    return selected ? [selected, ...detailAvailableNurses] : detailAvailableNurses;
  }, [detailAvailableNurses, detailNurseId, nurses]);

  const detailRoomOptions = useMemo(() => {
    if (detailRoomId <= 0) return detailAvailableRooms;
    if (detailAvailableRooms.some((r) => r.id === detailRoomId)) return detailAvailableRooms;
    const selected = rooms.find((r) => r.id === detailRoomId);
    return selected ? [selected, ...detailAvailableRooms] : detailAvailableRooms;
  }, [detailAvailableRooms, detailRoomId, rooms]);

  const detailAvailableStartTimes = useMemo(() => {
    if (!useClinicScheduleUi || !editDate) return TIME_OPTIONS;
    return TIME_OPTIONS.filter((startHm) =>
        TIME_OPTIONS.some(
            (endHm) =>
                hmToMinutes(endHm) > hmToMinutes(startHm) &&
                detailIntervalAllowedBySelections(editDate, startHm, endHm),
        ),
    );
  }, [detailIntervalAllowedBySelections, editDate, useClinicScheduleUi]);

  const detailAvailableEndTimes = useMemo(() => {
    if (!useClinicScheduleUi || !editDate)
      return TIME_OPTIONS.filter((x) => hmToMinutes(x) > hmToMinutes(editStart));
    return TIME_OPTIONS.filter(
        (endHm) =>
            hmToMinutes(endHm) > hmToMinutes(editStart) &&
            detailIntervalAllowedBySelections(editDate, editStart, endHm),
    );
  }, [detailIntervalAllowedBySelections, editDate, editStart, useClinicScheduleUi]);

  const detailStartTimeOptions = useMemo(() => {
    if (detailAvailableStartTimes.includes(editStart)) return detailAvailableStartTimes;
    return [editStart, ...detailAvailableStartTimes].sort((a, b) => hmToMinutes(a) - hmToMinutes(b));
  }, [detailAvailableStartTimes, editStart]);

  const detailEndTimeOptions = useMemo(() => {
    if (detailAvailableEndTimes.includes(editEnd)) return detailAvailableEndTimes;
    return [editEnd, ...detailAvailableEndTimes].sort((a, b) => hmToMinutes(a) - hmToMinutes(b));
  }, [detailAvailableEndTimes, editEnd]);

  useEffect(() => {
    if (!useClinicScheduleUi) return;

    if (
        formDentistId > 0 &&
        !availableDentists.some((d) => d.id === formDentistId)
    ) {
      setFormDentistId(0);
    }
    if (
        formNurseId > 0 &&
        !availableNurses.some((n) => n.id === formNurseId)
    ) {
      setFormNurseId(0);
    }
    if (
        formRoomId > 0 &&
        !availableRooms.some((r) => r.id === formRoomId)
    ) {
      setFormRoomId(0);
    }
  }, [
    availableDentists,
    availableNurses,
    availableRooms,
    formDentistId,
    formNurseId,
    formRoomId,
    useClinicScheduleUi,
  ]);

  // Removed the aggressive useEffect that auto-resets formStart/formEnd
  // to allow the clicked cell time to persist even if the staff availability
  // hasn't fully computed or if the time is technically outside strict hours.

  useEffect(() => {
    if (!useClinicScheduleUi || detailId == null) return;

    if (
        detailDentistId > 0 &&
        !detailDentistOptions.some((d) => d.id === detailDentistId)
    ) {
      setDetailDentistId(0);
    }
    if (
        detailNurseId > 0 &&
        !detailNurseOptions.some((n) => n.id === detailNurseId)
    ) {
      setDetailNurseId(0);
    }
    if (
        detailRoomId > 0 &&
        !detailRoomOptions.some((r) => r.id === detailRoomId)
    ) {
      setDetailRoomId(0);
    }
  }, [
    detailDentistOptions,
    detailNurseOptions,
    detailRoomOptions,
    detailDentistId,
    detailId,
    detailNurseId,
    detailRoomId,
    useClinicScheduleUi,
  ]);

  const directorDisplayName = `${directorStaff?.name ?? ''} ${directorStaff?.surname ?? ''}`.trim();
  const directorMenuItems = useMemo(
      () =>
          DIRECTOR_PORTAL_MENU.map((item) =>
              item.path === '/schedule'
                  ? { ...item, notificationCount: isDirector ? awaitingBlockingCount : 0 }
                  : item,
          ),
      [awaitingBlockingCount, isDirector],
  );

  const handleDirectorRequestAction = async (id: number, action: 'approve' | 'reject') => {
    if (!isDirector) return;
    setRequestActionBusyId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/blocking-hours/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (!res.ok) throw new Error(`blocking ${action}`);
      if (blockingDetailId === id) setBlockingDetailId(null);
      void fetchSchedule();
    } catch {
      setBlockingDetailError(t('blockingUpdateError'));
    } finally {
      setRequestActionBusyId(null);
    }
  };

  const openWorkingHoursModal = useCallback(async () => {
    if (!isDentistUser) return;
    setWorkingHoursModalOpen(true);
    setWorkingHoursLoading(true);
    setWorkingHoursError(null);
    try {
      if (!myStaffIdForSchedule) throw new Error('Staff id is missing');
      const res = await fetch(`${API_BASE_URL}/working-hours?staffId=${myStaffIdForSchedule}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (!res.ok) throw new Error('Failed to load working hours');
      const data = (await res.json()) as WorkingHourRow[];
      setWorkingHoursRows(Array.isArray(data) ? data : []);
    } catch {
      setWorkingHoursRows([]);
      setWorkingHoursError(t('workingHoursLoadError'));
    } finally {
      setWorkingHoursLoading(false);
    }
  }, [isDentistUser, myStaffIdForSchedule, t]);

  const workingHoursRowsSorted = useMemo(
      () =>
          [...workingHoursRows].sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            const startCmp = a.startTime.localeCompare(b.startTime);
            if (startCmp !== 0) return startCmp;
            return a.staffId - b.staffId;
          }),
      [workingHoursRows],
  );

  function ScheduleRowChrome({ children }: { children: ReactNode }) {
    if (isDentistUser) {
      return (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ClinicPortalShell
                brandTitle="Clinic Management"
                portalBadge="Dentist Portal"
                userDisplayName={dentistPortalDisplayName}
                userSubtitle="Dentist"
                menuItems={DENTIST_PORTAL_MENU}
                pathname={pathname}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                navigate={navigate}
                onLogoutClick={() => setShowLogoutConfirm(true)}
                showProfileStrip
                collapseToggleVariant="menu"
                embeddedLayout
            >
              {children}
            </ClinicPortalShell>
          </div>
      );
    }
    return (
        <div
            className={
              isDirector
                  ? 'mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden'
                  : 'flex min-h-0 min-w-0 flex-1 overflow-hidden'
            }
        >
          {isDirector && (
              <aside
                  className={`relative shrink-0 border-r border-slate-200 bg-[#f0f3f7] transition-all duration-300 ${
                      isSidebarOpen ? 'w-64' : 'w-20'
                  }`}
              >
                <div className="flex h-full min-h-0 flex-col py-6">
                  <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
                    {directorMenuItems.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                                isDirectorPortalNavActive(item.path, pathname)
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:bg-white/80'
                            }`}
                        >
                    <span className="relative inline-flex">
                      <item.icon size={16} className="shrink-0" />
                      {item.notificationCount != null && item.notificationCount > 0 && (
                          <span className="absolute -right-2 -top-2 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white">
                          {item.notificationCount > 99 ? '99+' : item.notificationCount}
                        </span>
                      )}
                    </span>
                          {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                        </button>
                    ))}
                  </nav>

                  <div className="mt-auto shrink-0 space-y-1 border-t border-slate-200/80 px-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
                    >
                      <LogOut size={16} className="shrink-0" />
                      {isSidebarOpen && <span className="ml-3 truncate">Logout</span>}
                    </button>
                  </div>
                </div>
              </aside>
          )}
          {children}
        </div>
    );
  }

  return (
      <>
        <div
            className={
              isDirector || isDentistUser
                  ? 'flex h-dvh min-h-0 flex-col overflow-hidden bg-[#f4f6f8] text-slate-700'
                  : 'flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50'
            }
        >
          {!isDirector && !isDentistUser && <Header />}

          {isDirector && (
              <header className="h-16 shrink-0 border-b border-slate-200 bg-white px-6">
                <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                        aria-label={isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
                    >
                      <Menu size={16} />
                    </button>
                    <span className="text-sm font-semibold text-slate-900">Precision Dental</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Admin Portal
              </span>
                  </div>

                  <div className="hidden lg:flex flex-1 max-w-md">
                    <input
                        type="text"
                        readOnly
                        value=""
                        placeholder="Search appointments..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button type="button" className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Notifications">
                      <Bell size={16} />
                    </button>
                    <button type="button" onClick={() => navigate('/staff')} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Staff and doctors">
                      <Settings size={16} />
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <div className="h-7 w-7 rounded-full bg-slate-200" />
                      <div className="leading-tight">
                        <p className="text-xs font-semibold text-slate-700">{directorDisplayName || '-'}</p>
                        <p className="text-[10px] text-slate-400">Clinic Director</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>
          )}

          <ScheduleRowChrome>
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              <main
                  ref={scheduleScrollRef}
                  className={
                    isDirector || isDentistUser
                        ? 'min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto px-6 py-6'
                        : 'mx-auto min-h-0 flex-1 min-w-0 max-w-[1600px] overflow-x-auto overflow-y-auto px-4 py-6 sm:px-6 lg:px-8'
                  }
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-9 h-9 text-violet-600" aria-hidden />
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                      <p className="text-sm text-gray-600">{rangeLabel}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                          if (!useClinicScheduleUi || viewMode === 'weekly') {
                            setWeekAnchor(startOfWeekMonday(new Date()));
                          } else {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            setDayAnchor(today);
                          }
                        }}
                        className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      {t('today')}
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            !useClinicScheduleUi || viewMode === 'weekly'
                                ? setWeekAnchor((w) => addDays(w, -7))
                                : setDayAnchor((d) => addDays(d, -1))
                        }
                        className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        aria-label={!useClinicScheduleUi || viewMode === 'weekly' ? t('prevWeek') : t('prevDay')}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            !useClinicScheduleUi || viewMode === 'weekly'
                                ? setWeekAnchor((w) => addDays(w, 7))
                                : setDayAnchor((d) => addDays(d, 1))
                        }
                        className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        aria-label={!useClinicScheduleUi || viewMode === 'weekly' ? t('nextWeek') : t('nextDay')}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {useClinicScheduleUi && (
                        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
                          <button
                              type="button"
                              onClick={() => setViewMode('weekly')}
                              className={`px-3 py-2 text-sm font-medium ${viewMode === 'weekly' ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            {t('viewWeekly')}
                          </button>
                          {isDirectorOrReception ? (
                              <>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('dailyRooms')}
                                    className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${viewMode === 'dailyRooms' ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                  {t('viewDailyRooms')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('dailyDentists')}
                                    className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${viewMode === 'dailyDentists' ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                  {t('viewDailyDentists')}
                                </button>
                              </>
                          ) : (
                              <button
                                  type="button"
                                  onClick={() => setViewMode('dailyMine')}
                                  className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${viewMode === 'dailyMine' ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                              >
                                {t('viewDailyMine')}
                              </button>
                          )}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => openNewModal()}
                        className="ml-auto sm:ml-0 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold shadow-sm hover:bg-violet-700"
                    >
                      {t('newRandevue')}
                    </button>
                    {(isDentistUser || isDirectorOrReception) && (
                        <button
                            type="button"
                            onClick={() => openNewModal(undefined, undefined, 'blocking')}
                            className="px-4 py-2.5 rounded-lg border border-amber-400 bg-amber-50 text-amber-900 text-sm font-semibold shadow-sm hover:bg-amber-100"
                        >
                          {t('newBlocking')}
                        </button>
                    )}
                    {isDentistUser && (
                        <button
                            type="button"
                            onClick={() => void openWorkingHoursModal()}
                            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold shadow-sm hover:bg-slate-50"
                        >
                          {t('workingHoursButton')}
                        </button>
                    )}
                    {isDirector && (
                        <button
                            type="button"
                            onClick={() => setShowDirectorRequests((prev) => !prev)}
                            className="relative px-4 py-2.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-800 text-sm font-semibold shadow-sm hover:bg-violet-100"
                        >
                          {t('requestsButton')}
                          {awaitingBlockingCount > 0 && (
                              <span className="ml-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white">
                    {awaitingBlockingCount > 99 ? '99+' : awaitingBlockingCount}
                  </span>
                          )}
                        </button>
                    )}
                  </div>
                </div>

                {isDirector && showDirectorRequests && (
                    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-800">{t('requestsPanelTitle')}</h2>
                        <span className="text-xs text-slate-500">
                {t('requestsCountLabel', { count: awaitingBlockingCount })}
              </span>
                      </div>
                      {awaitingBlockingRequests.length === 0 ? (
                          <p className="text-sm text-slate-600">{t('requestsEmpty')}</p>
                      ) : (
                          <div className="space-y-2">
                            {awaitingBlockingRequests.map((request) => {
                              const fullNameFromDentistList =
                                  request.staffId != null ? dentistDisplayNameByStaffId.get(request.staffId) : '';
                              const fullNameFromRow = `${request.staff?.name ?? ''} ${request.staff?.surname ?? ''}`.trim();
                              const dentistFullName =
                                  fullNameFromDentistList || fullNameFromRow || request.name?.trim() || t('dentistUnknown');
                              const start = new Date(request.startTime);
                              const end = new Date(request.endTime);
                              const timeRange = formatBlockingRequestDateRange(start, end);
                              const requestName = request.name?.trim() || t('blockingFallbackLabel');
                              const isBusy = requestActionBusyId === request.id;
                              return (
                                  <div
                                      key={request.id}
                                      className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-800">{dentistFullName}</p>
                                      <p className="truncate text-xs text-slate-500">{timeRange}</p>
                                      <p className="truncate text-xs text-slate-500">{requestName}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                          type="button"
                                          onClick={() => void handleDirectorRequestAction(request.id, 'approve')}
                                          disabled={isBusy}
                                          className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                          aria-label={t('requestApprove')}
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => void handleDirectorRequestAction(request.id, 'reject')}
                                          disabled={isBusy}
                                          className="inline-flex items-center justify-center rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                          aria-label={t('requestReject')}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                              );
                            })}
                          </div>
                      )}
                    </div>
                )}

                {isDirectorOrReception && viewMode === 'weekly' && !loading && !loadError && (
                    <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-200/60 bg-slate-50/40 p-2">
                      <div className="min-w-0 rounded border border-slate-200/50 bg-white/60">
                        <button
                            type="button"
                            onClick={() => setDirectorWeeklyFilterDentistsOpen((o) => !o)}
                            className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left text-xs font-medium text-slate-600"
                        >
                          <span className="truncate">{t('directorWeeklyFilterDentists')}</span>
                          <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${directorWeeklyFilterDentistsOpen ? 'rotate-180' : ''}`}
                              aria-hidden
                          />
                        </button>
                        {directorWeeklyFilterDentistsOpen && (
                            <div className="space-y-1.5 border-t border-slate-200/60 px-2 py-2">
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={
                                        dentists.length > 0 &&
                                        dentists.every((d) => directorWeeklyVisibleDentistIds.has(d.id))
                                    }
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setDirectorWeeklyVisibleDentistIds(new Set(dentists.map((d) => d.id)));
                                      } else {
                                        setDirectorWeeklyVisibleDentistIds(new Set());
                                      }
                                    }}
                                />
                                <span className="truncate">{t('directorWeeklyAllDentists')}</span>
                              </label>
                              <div className="max-h-36 space-y-1 overflow-y-auto">
                                {dentists.map((d) => {
                                  const label = `${d.staff?.name ?? ''} ${d.staff?.surname ?? ''}`.trim() || `Dr. #${d.id}`;
                                  return (
                                      <label
                                          key={d.id}
                                          className="flex min-w-0 cursor-pointer items-center gap-1.5 text-xs text-slate-600"
                                      >
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300"
                                            checked={directorWeeklyVisibleDentistIds.has(d.id)}
                                            onChange={(ev) => {
                                              setDirectorWeeklyVisibleDentistIds((prev) => {
                                                const next = new Set(prev);
                                                if (ev.target.checked) next.add(d.id);
                                                else next.delete(d.id);
                                                return next;
                                              });
                                            }}
                                        />
                                        <span
                                            className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                                            style={{
                                              backgroundColor:
                                                  dentistWeeklyHexByDentistId.get(d.id) ?? WEEKLY_DENTIST_HEX_COLORS[0],
                                            }}
                                            aria-hidden
                                        />
                                        <span className="truncate">{label}</span>
                                      </label>
                                  );
                                })}
                              </div>
                            </div>
                        )}
                      </div>

                      <div className="min-w-0 rounded border border-slate-200/50 bg-white/60">
                        <button
                            type="button"
                            onClick={() => setDirectorWeeklyFilterTypesOpen((o) => !o)}
                            className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left text-xs font-medium text-slate-600"
                        >
                          <span className="truncate">{t('directorWeeklyFilterTypes')}</span>
                          <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${directorWeeklyFilterTypesOpen ? 'rotate-180' : ''}`}
                              aria-hidden
                          />
                        </button>
                        {directorWeeklyFilterTypesOpen && (
                            <div className="space-y-1.5 border-t border-slate-200/60 px-2 py-2">
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                <input
                                    ref={directorWeeklyAllTypesCheckboxRef}
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={directorWeeklyShowRandevues && directorWeeklyShowBlocking}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setDirectorWeeklyShowRandevues(true);
                                        setDirectorWeeklyShowBlocking(true);
                                      } else {
                                        setDirectorWeeklyShowRandevues(false);
                                        setDirectorWeeklyShowBlocking(false);
                                      }
                                    }}
                                />
                                <span className="truncate">{t('directorWeeklyAllTypes')}</span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={directorWeeklyShowRandevues}
                                    onChange={(e) => setDirectorWeeklyShowRandevues(e.target.checked)}
                                />
                                <span className="truncate">{t('directorWeeklyLayerRandevues')}</span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={directorWeeklyShowBlocking}
                                    onChange={(e) => setDirectorWeeklyShowBlocking(e.target.checked)}
                                />
                                <span className="truncate">{t('directorWeeklyLayerBlocking')}</span>
                              </label>
                            </div>
                        )}
                      </div>
                    </div>
                )}

                {loading ? (
                    <p className="text-gray-600">{t('loading')}</p>
                ) : loadError ? (
                    <p className="text-red-600">{loadError}</p>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                      <div className="flex min-w-[720px]">
                        <div className="w-14 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                          <div className="h-12 border-b border-gray-200" />
                          {DISPLAY_HOURS.map((h, slot) => (
                              <div
                                  key={`${slot}-${h}`}
                                  className="text-xs text-gray-500 pr-2 text-right border-b border-gray-100 flex items-start justify-end tabular-nums"
                                  style={{ height: HOUR_PX }}
                              >
                                {formatHourLabel24(h)}
                              </div>
                          ))}
                        </div>

                        <div className="flex flex-1">
                          {(useClinicScheduleUi ? activeColumns : weeklyColumns).map((column) => {
                            const weeklyColumn = column as (typeof weeklyColumns)[number];
                            const isWeekly = !useClinicScheduleUi || viewMode === 'weekly';
                            const cellDay = isWeekly ? weeklyColumn.day : dayAnchor;
                            const isToday = isWeekly ? weeklyColumn.isToday : formatYmd(dayAnchor) === formatYmd(new Date());

                            return (
                                <div key={column.key} className="flex-1 min-w-[150px] border-r border-gray-200 last:border-r-0">
                                  <div
                                      className={`h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium px-2 text-center ${
                                          isToday ? 'text-violet-700 bg-violet-50' : 'text-gray-800'
                                      }`}
                                  >
                                    {column.label}
                                   </div>
                                   <div 
                                     className="relative" 
                                     style={{ height: DAY_PX }}
                                     onMouseLeave={() => setHoverTip(null)}
                                   >
                                     {DISPLAY_HOURS.map((h, slot) => {
                                       if (!useClinicScheduleUi) {
                                        return (
                                            <button
                                                key={`${column.key}-${slot}-${h}`}
                                                type="button"
                                                className="absolute left-0 right-0 z-[5] border-b border-gray-100 hover:bg-violet-50/40 transition-colors cursor-pointer"
                                                style={{ top: slot * HOUR_PX, height: HOUR_PX }}
                                                onClick={() => openNewModal(cellDay, h)}
                                                aria-label={`${t('newRandevue')} ${formatYmd(cellDay)} ${formatHourLabel24(h)}`}
                                            />
                                      );
                                      }
                                      return (
                                          <button
                                              key={`${column.key}-${slot}-${h}`}
                                              type="button"
                                              className="absolute left-0 right-0 z-[5] border-b border-gray-100 hover:bg-violet-50/40 transition-colors cursor-pointer px-1 py-0.5 text-left"
                                              style={{ top: slot * HOUR_PX, height: HOUR_PX }}
                                              onClick={() => openNewModal(cellDay, h)}
                                              aria-label={`${t('newRandevue')} ${formatYmd(cellDay)} ${formatHourLabel24(h)}`}
                                          >
                                          </button>
                                      );
                                    })}
                                    {useClinicScheduleUi &&
                                        (() => {
                                          const day = viewMode === 'weekly' ? weeklyColumn.day : dayAnchor;

                                          const matchesColumn = (r: Randevue): boolean => {
                                            if (isDentistUser) {
                                              if (loggedInDentistId <= 0 || r.dentist?.id !== loggedInDentistId) return false;
                                            }

                                            if (viewMode === 'weekly') {
                                              // Weekly view columns are days.
                                              return overlapsLocalDay(new Date(r.date), new Date(r.endTime), weeklyColumn.day);
                                            }

                                            if (viewMode === 'dailyRooms') {
                                              const rid = (column as (typeof roomColumns)[number]).roomId;
                                              return (r.room?.id ?? 0) === rid && overlapsLocalDay(new Date(r.date), new Date(r.endTime), dayAnchor);
                                            }

                                            // dailyDentists / dailyMine
                                            const did = (column as (typeof dentistColumns)[number]).dentistId;
                                            return (r.dentist?.id ?? 0) === did && overlapsLocalDay(new Date(r.date), new Date(r.endTime), dayAnchor);
                                          };

                                          const visible = randevuesForClinicGrid.filter(matchesColumn);
                                          if (visible.length === 0) return null;

                                          const laneItems = buildOverlapLanes(
                                              visible.map((r) => ({ item: r, start: new Date(r.date), end: new Date(r.endTime) })),
                                          );

                                          const OUTER_PX = 2;
                                          const GUTTER_PX = 2;
                                          const V_PAD_PX = 1;

                                          return laneItems.flatMap(({ item: r, start: s, end: e, lane, laneCount }) => {
                                            const segs = layoutSegments(day, s, e);
                                            if (segs.length === 0) return [];

                                            const weeklyHex =
                                                isDirector && (viewMode === 'weekly' || viewMode === 'dailyRooms' || viewMode === 'dailyDentists')
                                                    ? dentistWeeklyHexByDentistId.get(r.dentist?.id ?? 0) ?? '#64748b'
                                                    : null;

                                            const baseClass = weeklyHex
                                                ? 'bg-slate-500 hover:brightness-95'
                                                : 'bg-emerald-600 hover:bg-emerald-700';

                                            const widthPct = 100 / Math.max(1, laneCount);
                                            const leftPct = (lane / Math.max(1, laneCount)) * 100;
                                            const totalPxSubtract = OUTER_PX * 2 + Math.max(0, laneCount - 1) * GUTTER_PX;
                                            const leftPxAdd = OUTER_PX + lane * GUTTER_PX;

                                            return segs.map((seg, segIdx) => (
                                                <div
                                                    key={`clinic-r-${r.id}-${column.key}-${day.toISOString()}-${segIdx}`}
                                                    role="button"
                                                    tabIndex={0}
                                                    className={`absolute rounded-md ${baseClass} text-white text-[10px] px-1 py-0.5 shadow-sm overflow-hidden z-[15] cursor-pointer pointer-events-auto transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-1`}
                                                    style={{
                                                      top: seg.top + V_PAD_PX,
                                                      height: Math.max(seg.height - V_PAD_PX * 2, 6),
                                                      left: `calc(${leftPct}% + ${leftPxAdd}px)`,
                                                      width: `calc(${widthPct}% - ${totalPxSubtract}px)`,
                                                      backgroundColor: weeklyHex ?? undefined,
                                                    }}
                                                    onClick={(ev) => {
                                                      ev.stopPropagation();
                                                      openRandevueDetail(r);
                                                    }}
                                                    onKeyDown={(ev) => {
                                                      if (ev.key === 'Enter' || ev.key === ' ') {
                                                        ev.preventDefault();
                                                        openRandevueDetail(r);
                                                      }
                                                    }}
                                                    onMouseEnter={(ev) =>
                                                        setHoverTip({
                                                          kind: 'randevue',
                                                          r,
                                                          clientX: ev.clientX,
                                                          clientY: ev.clientY,
                                                        })
                                                    }
                                                    onMouseMove={(ev) =>
                                                        setHoverTip((prev) =>
                                                            prev?.kind === 'randevue' && prev.r.id === r.id
                                                                ? { kind: 'randevue', r, clientX: ev.clientX, clientY: ev.clientY }
                                                                : prev,
                                                        )
                                                    }
                                                    onMouseLeave={() => setHoverTip(null)}
                                                >
                                                  <p className="leading-tight truncate">
                                                    {roomTitleById.get(r.room?.id ?? 0) || t('roomUnknown')}
                                                  </p>
                                                  <p className="leading-tight truncate">
                                                    {`Dr. ${dentistSurnameById.get(r.dentist?.id ?? 0) || t('dentistUnknown')}`}
                                                  </p>
                                                </div>
                                            ));
                                          });
                                        })()}
                                    {useClinicScheduleUi &&
                                        scheduleBlockingHours
                                            .filter(
                                                () =>
                                                    !isDirectorOrReception ||
                                                    viewMode !== 'weekly' ||
                                                    directorWeeklyShowBlocking,
                                            )
                                            .filter((bh) => bh.staffId != null)
                                            .filter((bh) => {
                                              if (
                                                  isDirectorOrReception &&
                                                  viewMode === 'weekly' &&
                                                  bh.staffId != null
                                              ) {
                                                const d = dentistByStaffIdForSchedule.get(bh.staffId);
                                                if (d && !directorWeeklyVisibleDentistIds.has(d.id)) return false;
                                              }
                                              if (isDentistUser) {
                                                if (myStaffIdForSchedule == null || bh.staffId !== myStaffIdForSchedule) {
                                                  return false;
                                                }
                                              }
                                              const s = new Date(bh.startTime);
                                              const e = new Date(bh.endTime);
                                              if (viewMode === 'weekly') {
                                                return overlapsLocalDay(s, e, weeklyColumn.day);
                                              }
                                              if (viewMode === 'dailyRooms') {
                                                const rid = (column as (typeof roomColumns)[number]).roomId;
                                                if (bh.roomId == null || bh.roomId !== rid) return false;
                                                return overlapsLocalDay(s, e, dayAnchor);
                                              }
                                              const dent = column as (typeof dentistColumns)[number];
                                              const dstaff = dentists.find((d) => d.id === dent.dentistId)?.staff?.id;
                                              if (bh.staffId == null || dstaff !== bh.staffId) return false;
                                              return overlapsLocalDay(s, e, dayAnchor);
                                            })
                                            .flatMap((bh) => {
                                              const s = new Date(bh.startTime);
                                              const e = new Date(bh.endTime);
                                              const day = viewMode === 'weekly' ? weeklyColumn.day : dayAnchor;
                                              const segs = layoutSegments(day, s, e);
                                              const bhDentistLine =
                                                  bh.staffId != null
                                                      ? (() => {
                                                        const d = dentistByStaffIdForSchedule.get(bh.staffId);
                                                        return d?.staff
                                                            ? `${d.staff.name ?? ''} ${d.staff.surname ?? ''}`.trim()
                                                            : '';
                                                      })()
                                                      : '';
                                              const bhStatus = bh.approvalStatus ?? 'awaiting';
                                              return segs.map((seg, segIdx) => (
                                                  <div
                                                      key={`bh-${bh.id}-${column.key}-${segIdx}`}
                                                      role="button"
                                                      tabIndex={0}
                                                      className={`absolute left-0.5 right-0.5 rounded-md ${blockingStatusTone(bhStatus)} text-white text-[10px] px-1 py-0.5 shadow-sm z-[12] overflow-hidden ${
                                                          isDentistUser || isDirectorOrReception
                                                              ? 'pointer-events-auto cursor-pointer'
                                                              : 'pointer-events-none'
                                                      }`}
                                                      style={{ top: seg.top, height: seg.height }}
                                                      title={bh.name?.trim() || t('blockingFallbackLabel')}
                                                      onClick={(ev) => {
                                                        if (!isDentistUser && !isDirectorOrReception) return;
                                                        ev.stopPropagation();
                                                        openBlockingDetail(bh);
                                                      }}
                                                      onKeyDown={(ev) => {
                                                        if (!isDentistUser && !isDirectorOrReception) return;
                                                        if (ev.key === 'Enter' || ev.key === ' ') {
                                                          ev.preventDefault();
                                                          ev.stopPropagation();
                                                          openBlockingDetail(bh);
                                                        }
                                                      }}
                                                      onMouseEnter={(ev) => {
                                                        if (!isDirectorOrReception && !isDentistUser) return;
                                                        setHoverTip({
                                                          kind: 'blocking',
                                                          bh,
                                                          clientX: ev.clientX,
                                                          clientY: ev.clientY,
                                                        });
                                                      }}
                                                      onMouseMove={(ev) => {
                                                        if (!isDirectorOrReception && !isDentistUser) return;
                                                        setHoverTip((prev) =>
                                                            prev?.kind === 'blocking' && prev.bh.id === bh.id
                                                                ? { kind: 'blocking', bh, clientX: ev.clientX, clientY: ev.clientY }
                                                                : prev,
                                                        );
                                                      }}
                                                      onMouseLeave={() => setHoverTip(null)}
                                                  >
                                                    {isDirectorOrReception && bhDentistLine ? (
                                                        <span className="block truncate text-[9px] font-medium leading-tight opacity-95">
                                      {bhDentistLine}
                                    </span>
                                                    ) : null}
                                                    <span className="block truncate font-semibold leading-tight">
                                    {bh.name?.trim() || t('blockingFallbackLabel')}
                                  </span>
                                                    <span className="block truncate text-[9px] uppercase tracking-wide opacity-95">
                                    {bhStatus}
                                  </span>
                                                  </div>
                                              ));
                                            })}
                                    {!useClinicScheduleUi &&
                                        randevues.flatMap((r) => {
                                          const s = new Date(r.date);
                                          const e = new Date(r.endTime);
                                          const segs = layoutSegments(weeklyColumn.day, s, e);
                                          if (segs.length === 0) return [];
                                          const shade = randevueShadeByDayAndId.get(`${weeklyColumn.day.getTime()}-${r.id}`) ?? 0;
                                          const toneClass = shade === 0 ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700';
                                          const focusRingClass = shade === 0 ? 'focus:ring-violet-300' : 'focus:ring-emerald-300';
                                          return segs.map((seg, segIdx) => (
                                              <div
                                                  key={`${r.id}-${weeklyColumn.day.toISOString()}-${segIdx}`}
                                                  role="button"
                                                  tabIndex={0}
                                                  className={`absolute left-0.5 right-0.5 rounded-md ${toneClass} text-white text-xs px-1 py-0.5 shadow-sm overflow-hidden z-[15] cursor-pointer pointer-events-auto transition-colors focus:outline-none focus:ring-2 ${focusRingClass} focus:ring-offset-1`}
                                                  style={{ top: seg.top, height: seg.height }}
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    openRandevueDetail(r);
                                                  }}
                                                  onKeyDown={(ev) => {
                                                    if (ev.key === 'Enter' || ev.key === ' ') {
                                                      ev.preventDefault();
                                                      openRandevueDetail(r);
                                                    }
                                                  }}
                                                  onMouseEnter={(ev) =>
                                                      setHoverTip({
                                                        kind: 'randevue',
                                                        r,
                                                        clientX: ev.clientX,
                                                        clientY: ev.clientY,
                                                      })
                                                  }
                                                  onMouseMove={(ev) =>
                                                      setHoverTip((prev) =>
                                                          prev?.kind === 'randevue' && prev.r.id === r.id
                                                              ? {
                                                                kind: 'randevue',
                                                                r,
                                                                clientX: ev.clientX,
                                                                clientY: ev.clientY,
                                                              }
                                                              : prev,
                                                      )
                                                  }
                                                  onMouseLeave={() => setHoverTip(null)}
                                              >
                                <span className="font-semibold leading-tight block truncate pointer-events-none">
                                  {r.patient.name} {r.patient.surname}
                                </span>
                                              </div>
                                          ));
                                        })}
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                )}
              </main>

              {(detailId != null || blockingDetailId != null) && (
                  <aside
                      className="z-40 flex max-h-full min-h-0 w-full max-w-md shrink-0 flex-col border-l border-gray-200 bg-white shadow-lg lg:max-h-none lg:self-stretch"
                      aria-label={
                        blockingDetailId != null
                            ? t('blockingEditTitle')
                            : randevueDetailEditMode
                                ? t('editRandevue')
                                : t('randevueDetails')
                      }
                  >
                    <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900">
                        {blockingDetailId != null
                            ? t('blockingEditTitle')
                            : randevueDetailEditMode
                                ? t('editRandevue')
                                : t('randevueDetails')}
                      </h2>
                      <button
                          type="button"
                          onClick={() => {
                            setDetailId(null);
                            setBlockingDetailId(null);
                            setRandevueDetailEditMode(false);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                          aria-label={t('closeDetail')}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                      {blockingDetailId != null ? (
                          !blockingDetailRow ? (
                              <p className="text-sm text-gray-600">{t('blockingDetailNotFound')}</p>
                          ) : (
                              <>
                                {isDentistUser ? (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('blockingNameLabel')}</label>
                                        <input
                                            type="text"
                                            value={blockEditName}
                                            onChange={(e) => setBlockEditName(e.target.value)}
                                            maxLength={127}
                                            placeholder={t('blockingNameOptionalHint')}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
                                        <input
                                            type="date"
                                            value={blockEditDate}
                                            onChange={(e) => setBlockEditDate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                                          <select
                                              value={blockEditStart}
                                              onChange={(e) => setBlockEditStart(e.target.value)}
                                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                          >
                                            {TIME_OPTIONS.map((hm) => (
                                                <option key={`block-edit-start-${hm}`} value={hm}>
                                                  {hm}
                                                </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                                          <select
                                              value={blockEditEnd}
                                              onChange={(e) => setBlockEditEnd(e.target.value)}
                                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                          >
                                            {TIME_OPTIONS.map((hm) => (
                                                <option key={`block-edit-end-${hm}`} value={hm}>
                                                  {hm}
                                                </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    </>
                                ) : (
                                    <>
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">{t('blockingNameLabel')}:</span>{' '}
                                        {blockingDetailRow.name?.trim() || t('blockingFallbackLabel')}
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">{t('date')}:</span>{' '}
                                        {new Date(blockingDetailRow.startTime).toLocaleDateString(i18n.language)}
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">{t('startTime')}:</span>{' '}
                                        {localTimeHm(new Date(blockingDetailRow.startTime))}
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">{t('endTime')}:</span>{' '}
                                        {localTimeHm(new Date(blockingDetailRow.endTime))}
                                      </p>
                                    </>
                                )}
                                {blockingDetailRow.roomId != null && (
                                    <p className="text-sm text-gray-600">
                                      {t('room')}:{' '}
                                      <span className="font-medium text-gray-900">
                        {roomTitleById.get(blockingDetailRow.roomId) ?? `—`}
                      </span>
                                    </p>
                                )}
                                {blockingDetailError && <p className="text-sm text-red-600">{blockingDetailError}</p>}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                  {isDentistUser ? (
                                      <>
                                        <button
                                            type="button"
                                            disabled={blockingDeleteBusy || blockingDetailBusy}
                                            onClick={() => void handleCancelBlockingDetail()}
                                            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                        >
                                          {blockingDeleteBusy ? t('saving') : t('cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={blockingDetailBusy || blockingDeleteBusy}
                                            onClick={() => void handleSaveBlockingDetail()}
                                            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                                        >
                                          {blockingDetailBusy ? t('saving') : t('saveChanges')}
                                        </button>
                                      </>
                                  ) : (
                                      <>
                                        <button
                                            type="button"
                                            disabled={
                                                blockingDetailBusy ||
                                                blockingDeleteBusy ||
                                                blockingDetailRow.approvalStatus !== 'awaiting'
                                            }
                                            onClick={() => void handleRejectBlockingDetail()}
                                            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                        >
                                          Reject
                                        </button>
                                        <button
                                            type="button"
                                            disabled={
                                                blockingDetailBusy ||
                                                blockingDeleteBusy ||
                                                blockingDetailRow.approvalStatus !== 'awaiting'
                                            }
                                            onClick={() => void handleApproveBlockingDetail()}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                          Approve
                                        </button>
                                      </>
                                  )}
                                </div>
                              </>
                          )
                      ) : !detailRandevue ? (
                          <p className="text-sm text-gray-600">{t('detailNotFound')}</p>
                      ) : !randevueDetailEditMode ? (
                          <>
                            <div className="space-y-3 text-sm text-gray-800">
                              <p>
                                <span className="font-medium text-gray-700">{t('patient')}:</span>{' '}
                                {detailRandevue.patient.name} {detailRandevue.patient.surname}
                              </p>
                              <p>
                                <span className="font-medium text-gray-700">{t('date')}:</span>{' '}
                                {new Date(detailRandevue.date).toLocaleDateString(i18n.language, {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                              <p>
                                <span className="font-medium text-gray-700">{t('time')}:</span>{' '}
                                {localTimeHm(new Date(detailRandevue.date))} –{' '}
                                {localTimeHm(new Date(detailRandevue.endTime))}
                              </p>
                              {useClinicScheduleUi && (
                                  <p>
                                    <span className="font-medium text-gray-700">{t('room')}:</span>{' '}
                                    {roomTitleById.get(detailRandevue.room?.id ?? 0) || t('roomUnknown')}
                                  </p>
                              )}
                              <p>
                                <span className="font-medium text-gray-700">{t('doctor')}:</span>{' '}
                                {detailRandevue.dentist?.id != null
                                    ? (dentistFullNameByDentistId.get(detailRandevue.dentist.id) ?? t('dentistUnknown'))
                                    : t('dentistUnknown')}
                              </p>
                              {isDirector && useClinicScheduleUi && (
                                  <p>
                                    <span className="font-medium text-gray-700">{t('nurse')}:</span>{' '}
                                    {detailRandevue.nurse?.id != null
                                        ? (nurseFullNameByNurseId.get(detailRandevue.nurse.id) ??
                                            (`${detailRandevue.nurse.surname ?? ''} ${detailRandevue.nurse.name ?? ''}`.trim() ||
                                                `—`))
                                        : '—'}
                                  </p>
                              )}
                              <p>
                                <span className="font-medium text-gray-700">{t('status')}:</span>{' '}
                                {detailRandevue.status}
                              </p>
                              {detailRandevue.appointment && (
                                  <p>
                                    <span className="font-medium text-gray-700">{t('linkedAppointment')}:</span>{' '}
                                    #{detailRandevue.appointment.id}
                                    {detailRandevue.appointment.startDate
                                        ? ` · ${formatYmdDisplay(String(detailRandevue.appointment.startDate).slice(0, 10))}`
                                        : null}
                                  </p>
                              )}
                              <p>
                                <span className="font-medium text-gray-700">{t('note')}:</span>{' '}
                                {detailRandevue.note?.trim() ? detailRandevue.note : t('noNote')}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-4">
                              {detailRandevue.appointment?.id != null && (
                                  <button
                                      type="button"
                                      onClick={() =>
                                        navigate(`/appointments/${detailRandevue.appointment!.id}`, {
                                          state: {
                                            returnTo: `${location.pathname}${location.search}${location.hash}`,
                                            returnLabel: 'Back to Schedule',
                                          },
                                        })
                                      }
                                      className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
                                  >
                                    {t('goToAppointment')}
                                  </button>
                              )}
                              <button
                                  type="button"
                                  onClick={() => setRandevueDetailEditMode(true)}
                                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                              >
                                {t('editDetails')}
                              </button>
                            </div>
                          </>
                      ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
                              <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                                {useClinicScheduleUi ? (
                                    <select
                                        value={editStart}
                                        onChange={(e) => setEditStart(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                      {detailStartTimeOptions.map((hm) => (
                                          <option key={hm} value={hm}>
                                            {hm}
                                          </option>
                                      ))}
                                    </select>
                                ) : (
                                    <input
                                        type="time"
                                        value={editStart}
                                        onChange={(e) => setEditStart(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                                {useClinicScheduleUi ? (
                                    <select
                                        value={editEnd}
                                        onChange={(e) => setEditEnd(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                      {detailEndTimeOptions.map((hm) => (
                                          <option key={hm} value={hm}>
                                            {hm}
                                          </option>
                                      ))}
                                    </select>
                                ) : (
                                    <input
                                        type="time"
                                        value={editEnd}
                                        onChange={(e) => setEditEnd(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('patient')}</label>
                              <select
                                  value={editPatientId || ''}
                                  onChange={(e) => setEditPatientId(Number(e.target.value) || 0)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              >
                                <option value="">{t('selectPatient')}</option>
                                {patients.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.surname}, {p.name}
                                    </option>
                                ))}
                              </select>
                            </div>

                            {useClinicScheduleUi && (
                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('room')}</label>
                                    <select
                                        value={detailRoomId || ''}
                                        onChange={(e) => setDetailRoomId(Number(e.target.value) || 0)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    >
                                      <option value="">{t('selectRoom')}</option>
                                      {detailRoomOptions.map((room) => (
                                          <option key={room.id} value={room.id}>
                                            {room.number ? `Room ${room.number}` : room.description || `Room #${room.id}`}
                                          </option>
                                      ))}
                                    </select>
                                  </div>
                                  {!isDentistUser && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor')}</label>
                                      <select
                                          value={detailDentistId || ''}
                                          onChange={(e) => setDetailDentistId(Number(e.target.value) || 0)}
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                      >
                                        <option value="">{t('selectDoctor')}</option>
                                        {detailDentistOptions.map((dentist) => (
                                            <option key={dentist.id} value={dentist.id}>
                                              {`Dr. ${dentist.staff?.surname || `#${dentist.id}`}`}
                                            </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  {(isDirector || isDentistUser) && (
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('nurse')}</label>
                                        <select
                                            value={detailNurseId || ''}
                                            onChange={(e) => setDetailNurseId(Number(e.target.value) || 0)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        >
                                          <option value="">{t('selectNurse')}</option>
                                          {detailNurseOptions.map((nurse) => (
                                              <option key={nurse.id} value={nurse.id}>
                                                {nurse.staff?.surname && nurse.staff?.name
                                                    ? `${nurse.staff.surname}, ${nurse.staff.name}`
                                                    : `#${nurse.id}`}
                                              </option>
                                          ))}
                                        </select>
                                      </div>
                                  )}
                                </div>
                            )}

                            {editPatientId > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">{t('openAppointments')}</p>
                                  {detailApptsLoading ? (
                                      <p className="text-sm text-gray-500">…</p>
                                  ) : (
                                      <>
                                        {openAppointments.length === 0 && (
                                            <p className="text-sm text-gray-500 mb-2">{t('noOpenAppointments')}</p>
                                        )}
                                        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="detail-appt"
                                                checked={detailAppointmentChoice === 'none'}
                                                onChange={() => setDetailAppointmentChoice('none')}
                                            />
                                            {t('noneStandalone')}
                                          </label>
                                          {detailOpenAppointments.map((a) => (
                                              <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="detail-appt"
                                                    checked={detailAppointmentChoice === a.id}
                                                    onChange={() => setDetailAppointmentChoice(a.id)}
                                                />
                                                {formatYmdDisplay(a.startDate)}
                                              </label>
                                          ))}
                                          <label className="flex items-center gap-2 text-sm cursor-pointer pt-1 border-t border-gray-100">
                                            <input
                                                type="radio"
                                                name="detail-appt"
                                                checked={detailAppointmentChoice === 'new'}
                                                onChange={() => setDetailAppointmentChoice('new')}
                                            />
                                            {t('newAppointment')}
                                          </label>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">{t('newAppointmentHint')}</p>

                                        {typeof detailAppointmentChoice === 'number' && (
                                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                              <p className="text-sm font-medium text-gray-700 mb-2">{t('treatments')}</p>
                                              {detailLoadingTreatments ? (
                                                  <p className="text-sm text-gray-500">{t('loadingDots')}</p>
                                              ) : detailAppointmentTreatments.length === 0 ? (
                                                  <p className="text-sm text-gray-500">{t('noTreatmentsFound')}</p>
                                              ) : (
                                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {detailAppointmentTreatments.map((tt) => (
                                                        <label key={tt.id} className="flex items-start space-x-2 text-sm text-gray-700">
                                                          <input
                                                              type="checkbox"
                                                              checked={detailSelectedTreatmentIds.includes(tt.id)}
                                                              onChange={(e) => {
                                                                if (e.target.checked) {
                                                                  setDetailSelectedTreatmentIds((prev) => [...prev, tt.id]);
                                                                } else {
                                                                  setDetailSelectedTreatmentIds((prev) => prev.filter((id) => id !== tt.id));
                                                                }
                                                              }}
                                                              className="mt-1 text-violet-600 focus:ring-violet-500"
                                                          />
                                                          <span>
                                                            {tt.treatment.name}
                                                            {tt.toothTreatmentTeeth?.length > 0 && ` (T: ${tt.toothTreatmentTeeth.map(t => t.toothId).join(', ')})`}
                                                          </span>
                                                        </label>
                                                    ))}
                                                  </div>
                                              )}
                                            </div>
                                        )}
                                      </>
                                  )}
                                </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('note')}</label>
                              <textarea
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  rows={4}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              />
                            </div>
                            {detailError && <p className="text-sm text-red-600">{detailError}</p>}
                            <div className="flex flex-wrap justify-end gap-2 pt-2">
                              <button
                                  type="button"
                                  onClick={() => {
                                    const r = detailId != null ? randevues.find((x) => x.id === detailId) : undefined;
                                    if (r) syncDetailFormFromRandevue(r);
                                    setRandevueDetailEditMode(false);
                                  }}
                                  disabled={detailBusy}
                                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                {t('cancel')}
                              </button>
                              <button
                                  type="button"
                                  onClick={() => void handleSaveDetail()
}
                                  disabled={detailBusy}
                                  className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
                              >
                                {detailBusy ? t('saving') : t('saveChanges')}
                              </button>
                            </div>
                          </>
                      )}
                    </div>
                  </aside>
              )}
            </div>
          </ScheduleRowChrome>
        </div>

        {hoverTip && hoverTip.kind === 'randevue' && (
            <div
                className="fixed z-[100] pointer-events-none rounded-lg bg-gray-900 text-white text-xs shadow-xl px-3 py-2.5 max-w-[280px] leading-relaxed"
                style={{
                  left: tooltipLeft(hoverTip.clientX),
                  top: tooltipTop(hoverTip.clientY),
                }}
            >
              <p className="font-semibold text-sm">
                {hoverTip.r.patient.name} {hoverTip.r.patient.surname}
              </p>
              {hoverTip.r.dentist?.id != null && (
                  <p className="text-gray-200 mt-1">
                    {t('doctor')}: {dentistFullNameByDentistId.get(hoverTip.r.dentist.id) ?? t('dentistUnknown')}
                  </p>
              )}
              {hoverTip.r.nurse?.id != null && (
                  <p className="text-gray-200 mt-1">
                    {t('nurse')}: {nurseFullNameByNurseId.get(hoverTip.r.nurse.id) ?? `#${hoverTip.r.nurse.id}`}
                  </p>
              )}
              <p className="text-gray-200 mt-1">
                {t('room')}:{' '}
                {hoverTip.r.room?.id != null
                    ? roomTitleById.get(hoverTip.r.room.id) ?? t('roomUnknown')
                    : t('roomUnknown')}
              </p>
              <p className="text-gray-200 mt-1">
                {t('tooltipStartDate')}:{' '}
                {new Date(hoverTip.r.date).toLocaleDateString(i18n.language, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="text-gray-200">
                {t('startTime')}: {localTimeHm(new Date(hoverTip.r.date))}
              </p>
              <p className="text-gray-200">
                {t('endTime')}: {localTimeHm(new Date(hoverTip.r.endTime))}
              </p>
              <p className="text-gray-300 mt-1 border-t border-gray-700 pt-1">
                {t('note')}: {hoverTip.r.note?.trim() ? hoverTip.r.note : t('noNote')}
              </p>
            </div>
        )}

        {hoverTip && hoverTip.kind === 'blocking' && (
            <div
                className="fixed z-[100] pointer-events-none rounded-lg bg-gray-900 text-white text-xs shadow-xl px-3 py-2.5 max-w-[280px] leading-relaxed"
                style={{
                  left: tooltipLeft(hoverTip.clientX),
                  top: tooltipTop(hoverTip.clientY),
                }}
            >
              <p className="font-semibold text-sm">
                {hoverTip.bh.name?.trim() || t('blockingFallbackLabel')}
              </p>
              {(() => {
                const sid = hoverTip.bh.staffId;
                if (sid == null) return null;
                const d = dentistByStaffIdForSchedule.get(sid);
                const nm = d?.staff ? `${d.staff.name ?? ''} ${d.staff.surname ?? ''}`.trim() : '';
                if (!nm) return null;
                return (
                    <p className="text-gray-200 mt-1">
                      {t('doctor')}: {nm}
                    </p>
                );
              })()}
              <p className="text-gray-200 mt-1">
                {t('startTime')}: {localTimeHm(new Date(hoverTip.bh.startTime))}
              </p>
              <p className="text-gray-200">
                {t('endTime')}: {localTimeHm(new Date(hoverTip.bh.endTime))}
              </p>
            </div>
        )}

        {workingHoursModalOpen && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                onClick={() => setWorkingHoursModalOpen(false)}
                role="presentation"
            >
              <div
                  className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="working-hours-modal-title"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 id="working-hours-modal-title" className="text-xl font-bold text-gray-900">
                    {t('workingHoursTitle')}
                  </h2>
                  <button
                      type="button"
                      onClick={() => setWorkingHoursModalOpen(false)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {t('closeDetail')}
                  </button>
                </div>
                {workingHoursLoading ? (
                    <p className="text-sm text-gray-500">{t('loading')}</p>
                ) : workingHoursError ? (
                    <p className="text-sm text-red-600">{workingHoursError}</p>
                ) : workingHoursRowsSorted.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('workingHoursEmpty')}</p>
                ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="py-2 pr-3 font-semibold">dayOfWeek</th>
                            <th className="py-2 pr-3 font-semibold">startTime</th>
                            <th className="py-2 pr-3 font-semibold">endTime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workingHoursRowsSorted.map((wh) => {
                            return (
                                <tr key={wh.id} className="border-b border-slate-100 last:border-b-0">
                                  <td className="py-2 pr-3 text-slate-700">
                                    {formatWorkingHourDay(wh.dayOfWeek, i18n.language)}
                                  </td>
                                  <td className="py-2 pr-3 text-slate-700">{toHourMinute(wh.startTime)}</td>
                                  <td className="py-2 pr-3 text-slate-700">{toHourMinute(wh.endTime)}</td>
                                </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                )}
              </div>
            </div>
        )}

        {modalOpen && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                onClick={() => setModalOpen(false)}
                role="presentation"
            >
              <div
                  className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="randevue-modal-title"
              >
                <h2 id="randevue-modal-title" className="text-xl font-bold text-gray-900 mb-4">
                  {createModalTab === 'blocking' && (isDentistUser || isDirectorOrReception)
                      ? t('blockingModalTitle')
                      : t('modalTitle')}
                </h2>
                {(isDentistUser || isDirectorOrReception) && (
                    <div className="flex rounded-lg border border-gray-200 p-0.5 mb-4 bg-gray-50">
                      <button
                          type="button"
                          onClick={() => {
                            setCreateModalTab('randevue');
                            setFormDate(blockFormDate);
                            setFormStart(blockFormStart);
                            setFormEnd(blockFormEnd);
                          }}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              createModalTab === 'randevue' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        {t('newRandevue')}
                      </button>
                      <button
                          type="button"
                          onClick={() => {
                            setCreateModalTab('blocking');
                            setBlockFormDate(formDate);
                            setBlockFormStart(formStart);
                            setBlockFormEnd(formEnd);
                            setBlockSubmitError(null);
                          }}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              createModalTab === 'blocking' ? 'bg-white text-amber-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        {t('newBlocking')}
                      </button>
                    </div>
                )}
                {createModalTab === 'blocking' && (isDentistUser || isDirectorOrReception) ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        {t('blockingStaffLabel')}:{' '}
                        <span className="font-semibold text-gray-900">{blockingStaffLabel || '—'}</span>
                      </p>
                      {isDirectorOrReception && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor')}</label>
                            <select
                                value={formDentistId || ''}
                                onChange={(e) => setFormDentistId(Number(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            >
                              <option value="">{t('selectDoctor')}</option>
                              {dentists.map((dentist) => (
                                  <option key={dentist.id} value={dentist.id}>
                                    {`Dr. ${dentist.staff?.surname || `#${dentist.id}`}`}
                                  </option>
                              ))}
                            </select>
                          </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('blockingNameLabel')}</label>
                        <input
                            type="text"
                            value={blockFormName}
                            onChange={(e) => setBlockFormName(e.target.value)}
                            maxLength={127}
                            placeholder={t('blockingNameOptionalHint')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
                        <input
                            type="date"
                            value={blockFormDate}
                            onChange={(e) => setBlockFormDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                          <select
                              value={blockFormStart}
                              onChange={(e) => setBlockFormStart(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          >
                            {TIME_OPTIONS.map((hm) => (
                                <option key={`block-edit-start-${hm}`} value={hm}>
                                  {hm}
                                </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                          <select
                              value={blockFormEnd}
                              onChange={(e) => setBlockFormEnd(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          >
                            {TIME_OPTIONS.map((hm) => (
                                <option key={`block-edit-end-${hm}`} value={hm}>
                                  {hm}
                                </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {blockSubmitError && <p className="text-sm text-red-600">{blockSubmitError}</p>}
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {t('cancel')}
                        </button>
                        <button
                            type="button"
                            disabled={blockSubmitBusy}
                            onClick={() => void handleSubmitBlocking()}
                            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                        >
                          {blockSubmitBusy ? t('creating') : t('blockingSubmit')}
                        </button>
                      </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
                        <input
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('startTime')}</label>
                          {useClinicScheduleUi ? (
                              <select
                                  value={formStart}
                                  onChange={(e) => setFormStart(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              >
                                {Array.from(new Set([...availableStartTimes, formStart]))
                                    .sort((a, b) => hmToMinutes(a) - hmToMinutes(b))
                                    .map((hm) => (
                                    <option key={hm} value={hm}>
                                      {hm}
                                    </option>
                                ))}
                              </select>
                          ) : (
                              <input
                                  type="time"
                                  value={formStart}
                                  onChange={(e) => setFormStart(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                          {useClinicScheduleUi ? (
                              <select
                                  value={formEnd}
                                  onChange={(e) => setFormEnd(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              >
                                {Array.from(new Set([...availableEndTimes, formEnd]))
                                    .sort((a, b) => hmToMinutes(a) - hmToMinutes(b))
                                    .map((hm) => (
                                    <option key={hm} value={hm}>
                                      {hm}
                                    </option>
                                ))}
                              </select>
                          ) : (
                              <input
                                  type="time"
                                  value={formEnd}
                                  onChange={(e) => setFormEnd(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              />
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="text-sm font-medium text-gray-700">{t('patient')}</label>
                          <button
                              type="button"
                              onClick={() => {
                                setShowNewPatient((v) => !v);
                                setPatientFormMsg(null);
                              }}
                              className="text-sm text-violet-600 font-medium hover:underline"
                          >
                            {t('addNewPatient')}
                          </button>
                        </div>
                        <select
                            value={patientId || ''}
                            onChange={(e) => setPatientId(Number(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="">{t('selectPatient')}</option>
                          {patients.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.surname}, {p.name}
                              </option>
                          ))}
                        </select>
                      </div>

                      {useClinicScheduleUi && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('room')}</label>
                              <select
                                  value={formRoomId || ''}
                                  onChange={(e) => setFormRoomId(Number(e.target.value) || 0)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                              >
                                <option value="">{t('selectRoom')}</option>
                                {availableRooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                      {room.number ? `Room ${room.number}` : room.description || `Room #${room.id}`}
                                    </option>
                                ))}
                              </select>
                            </div>
                            {!isDentistUser && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor')}</label>
                                <select
                                    value={formDentistId || ''}
                                    onChange={(e) => setFormDentistId(Number(e.target.value) || 0)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                >
                                  <option value="">{t('selectDoctor')}</option>
                                  {availableDentists.map((dentist) => (
                                      <option key={dentist.id} value={dentist.id}>
                                        {`Dr. ${dentist.staff?.surname || `#${dentist.id}`}`}
                                      </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {(isDirector || isDentistUser) && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('nurse')}</label>
                                  <select
                                      value={formNurseId || ''}
                                      onChange={(e) => setFormNurseId(Number(e.target.value) || 0)}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                  >
                                    <option value="">{t('selectNurse')}</option>
                                    {availableNurses.map((nurse) => (
                                        <option key={nurse.id} value={nurse.id}>
                                          {nurse.staff?.surname && nurse.staff?.name
                                              ? `${nurse.staff.surname}, ${nurse.staff.name}`
                                              : `#${nurse.id}`}
                                        </option>
                                    ))}
                                  </select>
                                </div>
                            )}
                          </div>
                      )}

                      {showNewPatient && (
                          <div className="border border-violet-100 rounded-lg p-3 bg-violet-50/50 space-y-2">
                            <div>
                              <label htmlFor="schedule-new-patient-name" className="block text-xs font-medium text-gray-700 mb-0.5">
                                {t('newPatientName')}
                              </label>
                              <input
                                  id="schedule-new-patient-name"
                                  type="text"
                                  autoComplete="given-name"
                                  value={newPatient.name}
                                  onChange={(e) => setNewPatient((x) => ({ ...x, name: e.target.value }))}
                                  className="w-full border rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor="schedule-new-patient-surname" className="block text-xs font-medium text-gray-700 mb-0.5">
                                {t('newPatientSurname')}
                              </label>
                              <input
                                  id="schedule-new-patient-surname"
                                  type="text"
                                  autoComplete="family-name"
                                  value={newPatient.surname}
                                  onChange={(e) => setNewPatient((x) => ({ ...x, surname: e.target.value }))}
                                  className="w-full border rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                            <div>
                              <label htmlFor="schedule-new-patient-birth" className="block text-xs font-medium text-gray-700 mb-0.5">
                                {t('newPatientBirth')}
                              </label>
                              <input
                                  id="schedule-new-patient-birth"
                                  type="date"
                                  value={newPatient.birthDate}
                                  onChange={(e) => setNewPatient((x) => ({ ...x, birthDate: e.target.value }))}
                                  className="w-full border rounded px-2 py-1.5 text-sm"
                              />
                            </div>
                            <button
                                type="button"
                                disabled={patientFormBusy}
                                onClick={() => void handleCreatePatient()}
                                className="text-sm px-3 py-1.5 bg-violet-600 text-white rounded-lg disabled:opacity-50"
                            >
                              {t('savePatient')}
                            </button>
                          </div>
                      )}
                      {patientFormMsg && <p className="text-sm text-green-600">{patientFormMsg}</p>}

                      {patientId > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">{t('openAppointments')}</p>
                            {apptsLoading ? (
                                <p className="text-sm text-gray-500">…</p>
                            ) : (
                                <>
                                  {openAppointments.length === 0 && (
                                      <p className="text-sm text-gray-500 mb-2">{t('noOpenAppointments')}</p>
                                  )}
                                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input
                                          type="radio"
                                          name="appt"
                                          checked={appointmentChoice === 'none'}
                                          onChange={() => setAppointmentChoice('none')}
                                      />
                                      {t('noneStandalone')}
                                    </label>
                                    {openAppointments.map((a) => (
                                        <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                          <input
                                              type="radio"
                                              name="appt"
                                              checked={appointmentChoice === a.id}
                                              onChange={() => setAppointmentChoice(a.id)}
                                          />
                                          {formatYmdDisplay(a.startDate)}
                                        </label>
                                    ))}
                                    <label className="flex items-center gap-2 text-sm cursor-pointer pt-1 border-t border-gray-100">
                                      <input
                                          type="radio"
                                          name="appt"
                                          checked={appointmentChoice === 'new'}
                                          onChange={() => setAppointmentChoice('new')}
                                      />
                                      {t('newAppointment')}
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">{t('newAppointmentHint')}</p>

                                  {typeof appointmentChoice === 'number' && (
                                      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                        <p className="text-sm font-medium text-gray-700 mb-2">{t('treatments')}</p>
                                        {loadingTreatments ? (
                                            <p className="text-sm text-gray-500">{t('loadingDots')}</p>
                                        ) : appointmentTreatments.length === 0 ? (
                                            <p className="text-sm text-gray-500">{t('noTreatmentsFound')}</p>
                                        ) : (
                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                              {appointmentTreatments.map((tt) => (
                                                  <label key={tt.id} className="flex items-start space-x-2 text-sm text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTreatmentIds.includes(tt.id)}
                                                        onChange={(e) => {
                                                          if (e.target.checked) {
                                                            setSelectedTreatmentIds((prev) => [...prev, tt.id]);
                                                          } else {
                                                            setSelectedTreatmentIds((prev) => prev.filter((id) => id !== tt.id));
                                                          }
                                                        }}
                                                        className="mt-1 text-violet-600 focus:ring-violet-500"
                                                    />
                                                    <span>
                                                      {tt.treatment.name}
                                                      {tt.toothTreatmentTeeth?.length > 0 && ` (T: ${tt.toothTreatmentTeeth.map(t => t.toothId).join(', ')})`}
                                                    </span>
                                                  </label>
                                              ))}
                                            </div>
                                        )}
                                      </div>
                                  )}
                                </>
                            )}
                          </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('note')}</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {t('cancel')}
                        </button>
                        <button
                            type="button"
                            disabled={submitBusy}
                            onClick={() => void handleSubmitRandevue()}
                            className="px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
                        >
                          {submitBusy ? t('creating') : t('submit')}
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}
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

export default Schedule;
