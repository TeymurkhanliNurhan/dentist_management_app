import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  API_BASE_URL,
  appointmentService,
  patientService,
  randevueService,
  type Appointment,
  type CreatePatientDto,
  type CreateRandevueDto,
  type Patient,
  type Randevue,
  type UpdateRandevueDto,
} from '../services/api';

/** First row of the grid (top) — full 24h still shown, order is 08:00 … 23:00 then 00:00 … 07:00 */
const SCHEDULE_START_HOUR = 8;
const HOURS_IN_DAY = 24;
const DISPLAY_HOURS = Array.from({ length: HOURS_IN_DAY }, (_, i) => (SCHEDULE_START_HOUR + i) % HOURS_IN_DAY);
const HOUR_PX = 48;
const DAY_PX = HOURS_IN_DAY * HOUR_PX;

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

type AppointmentChoice = 'none' | 'new' | number;

function dayBoundsLocal(day: Date): { start: Date; next: Date } {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const next = new Date(start);
  next.setDate(next.getDate() + 1);
  return { start, next };
}

/** Y-offset from top of column where 08:00 = 0 and 07:59 = bottom (wraps midnight-08:00 after 23:00). */
function offsetMsFromScheduleStart(midnight: Date, eightAm: Date, t: Date): number {
  const tms = t.getTime();
  if (tms >= eightAm.getTime()) return tms - eightAm.getTime();
  return 16 * 3600000 + (tms - midnight.getTime());
}

/**
 * One or two rectangles when an interval crosses 08:00 on the same calendar day.
 */
function layoutSegments(day: Date, start: Date, end: Date): { top: number; height: number }[] {
  const { start: midnight, next: dayAfter } = dayBoundsLocal(day);
  if (end <= midnight || start >= dayAfter) return [];
  const visStart = start > midnight ? start : midnight;
  const visEnd = end < dayAfter ? end : dayAfter;
  if (visEnd <= visStart) return [];

  const eightAm = new Date(midnight);
  eightAm.setHours(SCHEDULE_START_HOUR, 0, 0, 0);

  const totalMs = 24 * 3600000;

  const piece = (a: Date, b: Date): { top: number; height: number } | null => {
    if (b <= a) return null;
    const top = (offsetMsFromScheduleStart(midnight, eightAm, a) / totalMs) * DAY_PX;
    const h =
      ((offsetMsFromScheduleStart(midnight, eightAm, b) - offsetMsFromScheduleStart(midnight, eightAm, a)) /
        totalMs) *
      DAY_PX;
    return { top, height: Math.max(h, 20) };
  };

  const out: { top: number; height: number }[] = [];
  if (visStart < eightAm && visEnd > eightAm) {
    const p1 = piece(visStart, eightAm);
    const p2 = piece(eightAm, visEnd);
    if (p1) out.push(p1);
    if (p2) out.push(p2);
  } else {
    const p = piece(visStart, visEnd);
    if (p) out.push(p);
  }
  return out;
}

function formatHourLabel24(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
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

function overlapsHourSlot(start: Date, end: Date, day: Date, hour: number): boolean {
  const slotStart = new Date(day);
  slotStart.setHours(hour, 0, 0, 0);
  const slotEnd = new Date(slotStart);
  slotEnd.setHours(slotStart.getHours() + 1, 0, 0, 0);
  return start < slotEnd && end > slotStart;
}

type ScheduleViewMode = 'weekly' | 'dailyRooms' | 'dailyDentists';

interface RoomColumn {
  id: number;
  number: string;
  description: string;
}

interface DentistColumn {
  id: number;
  staff?: {
    name?: string;
    surname?: string;
  };
}

interface NurseColumn {
  id: number;
  staff?: {
    name?: string;
    surname?: string;
  };
}

interface StaffSummary {
  name?: string;
  surname?: string;
}

const Schedule = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('schedule');
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<number>(0);
  const [note, setNote] = useState('');
  const [openAppointments, setOpenAppointments] = useState<Appointment[]>([]);
  const [appointmentChoice, setAppointmentChoice] = useState<AppointmentChoice>('none');
  const [apptsLoading, setApptsLoading] = useState(false);

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
  const [editPatientId, setEditPatientId] = useState(0);
  const [editNote, setEditNote] = useState('');
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailAppointmentChoice, setDetailAppointmentChoice] = useState<AppointmentChoice>('none');
  const [detailOpenAppointments, setDetailOpenAppointments] = useState<Appointment[]>([]);
  const [detailApptsLoading, setDetailApptsLoading] = useState(false);

  const [hoverTip, setHoverTip] = useState<{
    r: Randevue;
    clientX: number;
    clientY: number;
  } | null>(null);

  useEffect(() => {
    const fetchDirectorStaff = async () => {
      if (!isDirector) {
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
  }, [isDirector]);

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const rangeLabel = useMemo(() => {
    if (isDirector && viewMode !== 'weekly') {
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
  }, [dayAnchor, days, i18n.language, isDirector, viewMode]);

  const randevueShadeByDayAndId = useMemo(() => {
    if (isDirector) return new Map<string, 0 | 1>();
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
  }, [days, isDirector, randevues]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!isDirector) {
        const range = weekRangeIso(weekAnchor);
        const randevueData = await randevueService.getForRange(range.from, range.to);
        setRandevues(randevueData);
        setRooms([]);
        setDentists([]);
        setNurses([]);
      } else {
        const range =
          viewMode === 'weekly' ? weekRangeIso(weekAnchor) : toApiIsoLocalDayBounds(dayAnchor);

        const [randevueData, roomsRes, dentistsRes, nursesRes] = await Promise.all([
          randevueService.getForRange(range.from, range.to),
          fetch(`${API_BASE_URL}/room`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
          }),
          fetch(`${API_BASE_URL}/dentist`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
          }),
          fetch(`${API_BASE_URL}/nurse`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
          }),
        ]);

        const roomsData = roomsRes.ok ? ((await roomsRes.json()) as RoomColumn[]) : [];
        const dentistsData = dentistsRes.ok ? ((await dentistsRes.json()) as DentistColumn[]) : [];
        const nursesData = nursesRes.ok ? ((await nursesRes.json()) as NurseColumn[]) : [];

        setRandevues(randevueData);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setDentists(Array.isArray(dentistsData) ? dentistsData : []);
        setNurses(Array.isArray(nursesData) ? nursesData : []);
      }
    } catch {
      setLoadError(t('loadError'));
      setRandevues([]);
      setRooms([]);
      setDentists([]);
      setNurses([]);
    } finally {
      setLoading(false);
    }
  }, [dayAnchor, isDirector, t, viewMode, weekAnchor]);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalOpen) setModalOpen(false);
      else if (detailId != null) setDetailId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, detailId]);

  useEffect(() => {
    if (detailId == null) return;
    const r = randevues.find((x) => x.id === detailId);
    if (!r) return;
    const s = new Date(r.date);
    const e = new Date(r.endTime);
    setEditDate(formatYmd(s));
    setEditStart(localTimeHm(s));
    setEditEnd(localTimeHm(e));
    setEditPatientId(r.patient.id);
    setEditNote(r.note ?? '');
    setDetailAppointmentChoice(r.appointment ? r.appointment.id : 'none');
    setDetailError(null);
  }, [detailId, randevues]);

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
            const cur = randevues.find((x) => x.id === detailId);
            if (cur?.appointment?.id === prev) return prev;
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

  const openNewModal = (day?: Date, hour?: number) => {
    setDetailId(null);
    const baseDay = day ?? new Date();
    setFormDate(formatYmd(baseDay));
    setFormStart(hour != null ? `${String(hour).padStart(2, '0')}:00` : '09:00');
    setFormEnd(hour != null ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '10:00');
    setNote('');
    setPatientId(0);
    setAppointmentChoice('none');
    setFormRoomId(0);
    setFormDentistId(0);
    setFormNurseId(0);
    setShowNewPatient(false);
    setNewPatient({ name: '', surname: '', birthDate: '' });
    setPatientFormMsg(null);
    setSubmitError(null);
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
    if (isDirector && formRoomId > 0) body.room_id = formRoomId;
    if (isDirector && formDentistId > 0) body.dentist_id = formDentistId;
    if (isDirector && formNurseId > 0) body.nurse_id = formNurseId;

    if (appointmentChoice === 'new') {
      body.create_new_appointment = true;
      body.appointment_start_date = formDate;
    } else if (typeof appointmentChoice === 'number') {
      body.appointment_id = appointmentChoice;
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

  const openRandevueDetail = (r: Randevue) => {
    setDetailId(r.id);
    setModalOpen(false);
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

    const body: UpdateRandevueDto = {
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      patient_id: editPatientId,
      note: editNote,
    };

    if (detailAppointmentChoice === 'new') {
      body.create_new_appointment = true;
      body.appointment_start_date = editDate;
    } else if (typeof detailAppointmentChoice === 'number') {
      if (detailAppointmentChoice !== linkedId) {
        body.appointment_id = detailAppointmentChoice;
      }
    } else if (hadLink) {
      body.clear_appointment = true;
    }

    setDetailBusy(true);
    try {
      await randevueService.update(detailId, body);
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

  const roomTitleById = useMemo(() => {
    const map = new Map<number, string>();
    for (const room of rooms) {
      const label = room.number ? `Room ${room.number}` : room.description || `Room #${room.id}`;
      map.set(room.id, label);
    }
    return map;
  }, [rooms]);

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

  const activeColumns =
    viewMode === 'weekly'
      ? weeklyColumns
      : viewMode === 'dailyRooms'
        ? roomColumns
        : dentistColumns;

  const randevuesByColumnAndHour = useMemo(() => {
    const map = new Map<string, Randevue[]>();
    const push = (key: string, r: Randevue) => {
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    };

    for (const r of randevues) {
      const start = new Date(r.date);
      const end = new Date(r.endTime);
      for (const hour of DISPLAY_HOURS) {
        if (viewMode === 'weekly') {
          for (const day of days) {
            if (!overlapsHourSlot(start, end, day, hour)) continue;
            push(`day:${formatYmd(day)}|hour:${hour}`, r);
          }
        } else if (viewMode === 'dailyRooms') {
          if (!r.room?.id) continue;
          if (!overlapsHourSlot(start, end, dayAnchor, hour)) continue;
          push(`room:${r.room.id}|hour:${hour}`, r);
        } else {
          if (!r.dentist?.id) continue;
          if (!overlapsHourSlot(start, end, dayAnchor, hour)) continue;
          push(`dentist:${r.dentist.id}|hour:${hour}`, r);
        }
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return map;
  }, [dayAnchor, days, randevues, viewMode]);

  const directorDisplayName = `${directorStaff?.name ?? ''} ${directorStaff?.surname ?? ''}`.trim();
  const directorMenuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
    { label: 'Inventory', icon: Package, path: '/medicines' },
    { label: 'Staff/Doctors', icon: Users, path: '/settings' },
    { label: 'Finance', icon: Wallet, path: '/appointments' },
  ];
  const directorFooterItems = [
    { label: 'Help', icon: CircleHelp },
    { label: 'Logout', icon: LogOut },
  ];

  return (
    <div className={isDirector ? 'min-h-screen bg-[#f4f6f8] text-slate-700' : 'min-h-screen bg-slate-50 flex flex-col'}>
      {!isDirector && <Header />}

      {isDirector && (
        <header className="h-16 border-b border-slate-200 bg-white px-6">
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
              <button type="button" onClick={() => navigate('/settings')} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Open settings">
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

      <div className={isDirector ? 'mx-auto flex w-full max-w-[1600px] min-h-[calc(100vh-4rem)]' : 'flex flex-1 min-h-0'}>
        {isDirector && (
          <aside
            className={`relative border-r border-slate-200 bg-[#f0f3f7] transition-all duration-300 ${
              isSidebarOpen ? 'w-64' : 'w-20'
            }`}
          >
            <div className="flex h-full flex-col justify-between py-6">
              <nav className="space-y-1 px-3">
                {directorMenuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                      item.path === '/schedule'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:bg-white/80'
                    }`}
                  >
                    <item.icon size={16} />
                    {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                  </button>
                ))}
              </nav>

              <div className="space-y-1 px-3">
                {directorFooterItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-white/80"
                  >
                    <item.icon size={16} />
                    {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

      <div className="flex flex-1 min-h-0">
      <main className={isDirector ? 'flex-1 min-w-0 px-6 py-6 overflow-x-auto' : 'flex-1 min-w-0 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-auto'}>
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
                if (!isDirector || viewMode === 'weekly') {
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
                !isDirector || viewMode === 'weekly'
                  ? setWeekAnchor((w) => addDays(w, -7))
                  : setDayAnchor((d) => addDays(d, -1))
              }
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              aria-label={!isDirector || viewMode === 'weekly' ? t('prevWeek') : t('prevDay')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                !isDirector || viewMode === 'weekly'
                  ? setWeekAnchor((w) => addDays(w, 7))
                  : setDayAnchor((d) => addDays(d, 1))
              }
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              aria-label={!isDirector || viewMode === 'weekly' ? t('nextWeek') : t('nextDay')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {isDirector && (
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-2 text-sm font-medium ${viewMode === 'weekly' ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {t('viewWeekly')}
                </button>
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
              </div>
            )}
            <button
              type="button"
              onClick={() => openNewModal()}
              className="ml-auto sm:ml-0 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold shadow-sm hover:bg-violet-700"
            >
              {t('newRandevue')}
            </button>
          </div>
        </div>

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
                {(isDirector ? activeColumns : weeklyColumns).map((column) => {
                  const weeklyColumn = column as (typeof weeklyColumns)[number];
                  const isWeekly = !isDirector || viewMode === 'weekly';
                  const cellDay = isWeekly ? weeklyColumn.day : dayAnchor;
                  const isToday = isWeekly ? weeklyColumn.isToday : formatYmd(dayAnchor) === formatYmd(new Date());

                  const getCellKey = (hour: number) => {
                    if (viewMode === 'weekly') return `day:${formatYmd(weeklyColumn.day)}|hour:${hour}`;
                    if (viewMode === 'dailyRooms') return `room:${(column as (typeof roomColumns)[number]).roomId}|hour:${hour}`;
                    return `dentist:${(column as (typeof dentistColumns)[number]).dentistId}|hour:${hour}`;
                  };

                  return (
                    <div key={column.key} className="flex-1 min-w-[150px] border-r border-gray-200 last:border-r-0">
                      <div
                        className={`h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium px-2 text-center ${
                          isToday ? 'text-violet-700 bg-violet-50' : 'text-gray-800'
                        }`}
                      >
                        {column.label}
                      </div>
                      <div className="relative" style={{ height: DAY_PX }}>
                        {DISPLAY_HOURS.map((h, slot) => {
                          if (!isDirector) {
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
                          const list = randevuesByColumnAndHour.get(getCellKey(h)) ?? [];
                          return (
                            <button
                              key={`${column.key}-${slot}-${h}`}
                              type="button"
                              className="absolute left-0 right-0 z-[5] border-b border-gray-100 hover:bg-violet-50/40 transition-colors cursor-pointer px-1 py-0.5 text-left"
                              style={{ top: slot * HOUR_PX, height: HOUR_PX }}
                              onClick={() => openNewModal(cellDay, h)}
                              aria-label={`${t('newRandevue')} ${formatYmd(cellDay)} ${formatHourLabel24(h)}`}
                            >
                              <div className="space-y-0.5">
                                {list.map((r) => (
                                  <div
                                    key={`${column.key}-${h}-${r.id}`}
                                    role="button"
                                    tabIndex={0}
                                    className="rounded bg-violet-600 hover:bg-violet-700 text-white text-[10px] px-1 py-0.5 shadow-sm overflow-hidden pointer-events-auto transition-colors focus:outline-none focus:ring-1 focus:ring-violet-300"
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
                                    onMouseEnter={(ev) => setHoverTip({ r, clientX: ev.clientX, clientY: ev.clientY })}
                                    onMouseMove={(ev) =>
                                      setHoverTip((prev) =>
                                        prev && prev.r.id === r.id ? { r, clientX: ev.clientX, clientY: ev.clientY } : prev,
                                      )
                                    }
                                    onMouseLeave={() => setHoverTip((prev) => (prev?.r.id === r.id ? null : prev))}
                                  >
                                    <p className="leading-tight truncate">
                                      {roomTitleById.get(r.room?.id ?? 0) || t('roomUnknown')}
                                    </p>
                                    <p className="leading-tight truncate">
                                      {`Dr. ${dentistSurnameById.get(r.dentist?.id ?? 0) || t('dentistUnknown')}`}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                        {!isDirector &&
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
                                  setHoverTip({ r, clientX: ev.clientX, clientY: ev.clientY })
                                }
                                onMouseMove={(ev) =>
                                  setHoverTip((prev) =>
                                    prev && prev.r.id === r.id
                                      ? { r, clientX: ev.clientX, clientY: ev.clientY }
                                      : prev,
                                  )
                                }
                                onMouseLeave={() =>
                                  setHoverTip((prev) => (prev?.r.id === r.id ? null : prev))
                                }
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

      {detailId != null && (
        <aside
          className="w-full max-w-md flex-shrink-0 border-l border-gray-200 bg-white shadow-lg z-40 flex flex-col max-h-[calc(100vh-4rem)] lg:max-h-none lg:min-h-[calc(100vh-5rem)]"
          aria-label={t('editRandevue')}
        >
          <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{t('editRandevue')}</h2>
            <button
              type="button"
              onClick={() => setDetailId(null)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label={t('closeDetail')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {!detailRandevue ? (
              <p className="text-sm text-gray-600">{t('detailNotFound')}</p>
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
                    <input
                      type="time"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                    <input
                      type="time"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
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

                {editPatientId > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('openAppointments')}</p>
                    {detailApptsLoading ? (
                      <p className="text-sm text-gray-500">…</p>
                    ) : (
                      <>
                        {detailOpenAppointments.length === 0 &&
                          !(
                            detailRandevue?.appointment &&
                            !detailOpenAppointments.some((a) => a.id === detailRandevue.appointment!.id)
                          ) && <p className="text-sm text-gray-500 mb-2">{t('noOpenAppointments')}</p>}
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
                          {detailRandevue?.appointment &&
                            !detailOpenAppointments.some((a) => a.id === detailRandevue.appointment!.id) && (
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="radio"
                                  name="detail-appt"
                                  checked={detailAppointmentChoice === detailRandevue.appointment.id}
                                  onChange={() =>
                                    setDetailAppointmentChoice(detailRandevue.appointment!.id)
                                  }
                                />
                                #{detailRandevue.appointment.id} — {t('currentAppointmentLink')}
                              </label>
                            )}
                          {detailOpenAppointments.map((a) => (
                            <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="radio"
                                name="detail-appt"
                                checked={detailAppointmentChoice === a.id}
                                onChange={() => setDetailAppointmentChoice(a.id)}
                              />
                              #{a.id} — {a.startDate}
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
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveDetail()}
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
      </div>

      {hoverTip && (
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
              {t('modalTitle')}
            </h2>

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
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('endTime')}</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
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

              {isDirector && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('room')}</label>
                    <select
                      value={formRoomId || ''}
                      onChange={(e) => setFormRoomId(Number(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">{t('selectRoom')}</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.number ? `Room ${room.number}` : room.description || `Room #${room.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('nurse')}</label>
                    <select
                      value={formNurseId || ''}
                      onChange={(e) => setFormNurseId(Number(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">{t('selectNurse')}</option>
                      {nurses.map((nurse) => (
                        <option key={nurse.id} value={nurse.id}>
                          {nurse.staff?.surname && nurse.staff?.name
                            ? `${nurse.staff.surname}, ${nurse.staff.name}`
                            : `#${nurse.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
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
                            #{a.id} — {a.startDate}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
