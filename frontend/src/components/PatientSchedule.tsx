import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { PatientPortalShell } from './PatientPortalShell';
import {
  API_BASE_URL,
  appointmentService,
  randevueService,
  type Appointment,
  type ClinicOccupancySlot,
  type CreateRandevueDto,
} from '../services/api';
import { getPatientId } from '../lib/patientSession';
import { formatMonthLabel, formatWeekdayShort } from '../lib/localeHelpers';

const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 22;
const VISIBLE_HOURS = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;
const DISPLAY_HOURS = Array.from({ length: VISIBLE_HOURS }, (_, i) => SCHEDULE_START_HOUR + i);
const HOUR_PX = 56;
const DAY_PX = VISIBLE_HOURS * HOUR_PX;
/** Solid, full-width occupied cells — no rounding or opacity so layers never look darker. */
const PATIENT_OCCUPIED_CELL =
  'pointer-events-auto absolute inset-x-0 z-[10] cursor-not-allowed bg-slate-500';

type AppointmentChoice = 'none' | 'new' | number;

interface DentistColumn {
  id: number;
  staff?: {
    id?: number;
    name?: string;
    surname?: string;
  };
}

interface WorkingHourRow {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  staffId: number;
  staff?: { id?: number } | null;
}

interface BlockingHourRow {
  id: number;
  startTime: string;
  endTime: string;
  staffId: number | null;
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

function apiDayOfWeekFromDate(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function combineLocalDateAndTime(dateYmd: string, timeHm: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [hh, mm = '0'] = timeHm.split(':');
  return new Date(y, m - 1, d, Number(hh), Number(mm), 0, 0);
}

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
  const top =
    ((visStart.getTime() - visibleStart.getTime()) / totalMs) * DAY_PX;
  const height = ((visEnd.getTime() - visStart.getTime()) / totalMs) * DAY_PX;
  return [{ top, height: Math.max(height, 20) }];
}

function formatHourLabel24(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function toApiIsoLocalDayBounds(day: Date): { from: string; to: string } {
  const fromDate = new Date(day);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 1);
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

function timeStringToMinutes(value: string): number {
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
}

function normalizeWorkingHourRows(rows: WorkingHourRow[]): WorkingHourRow[] {
  return rows.map((wh) => {
    const nestedId = wh.staff?.id;
    const resolved =
      typeof wh.staffId === 'number' && Number.isFinite(wh.staffId) ? wh.staffId : nestedId;
    if (resolved == null || !Number.isFinite(resolved)) return wh;
    return { ...wh, staffId: resolved };
  });
}

function isStaffHourSlotWithinWorkingHours(
  staffId: number,
  day: Date,
  hourBandStart: number,
  rows: WorkingHourRow[],
): boolean {
  const dow = apiDayOfWeekFromDate(day);
  const slotStartMin = hourBandStart * 60;
  const slotEndMin = (hourBandStart + 1) * 60;
  return rows.some((wh) => {
    if (wh.staffId !== staffId || wh.dayOfWeek !== dow) return false;
    const whStart = timeStringToMinutes(wh.startTime);
    const whEnd = timeStringToMinutes(wh.endTime);
    return slotStartMin >= whStart && slotEndMin <= whEnd;
  });
}

function formatYmdDisplay(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!m) return ymd;
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}

const PatientSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('schedule');
  const patientId = getPatientId() ?? 0;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [dayAnchor, setDayAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dentists, setDentists] = useState<DentistColumn[]>([]);
  const [occupancy, setOccupancy] = useState<ClinicOccupancySlot[]>([]);
  const [blockingHours, setBlockingHours] = useState<BlockingHourRow[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formDentistId, setFormDentistId] = useState(0);
  const [note, setNote] = useState('');
  const [appointmentChoice, setAppointmentChoice] = useState<AppointmentChoice>('none');
  const [openAppointments, setOpenAppointments] = useState<Appointment[]>([]);
  const [apptsLoading, setApptsLoading] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!patientId) return;
      try {
        const list = await appointmentService.getAll({ patient: patientId, limit: 1, page: 1 });
        const p = list.appointments[0]?.patient;
        if (!cancelled && p) {
          setDisplayName(`${p.name ?? ''} ${p.surname ?? ''}`.trim());
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const rangeLabel = useMemo(() => {
    const isAz = i18n.language?.split('-')[0]?.toLowerCase() === 'az';
    if (isAz) {
      const weekday = formatWeekdayShort(dayAnchor, i18n.language);
      return `${weekday}, ${dayAnchor.getDate()} ${formatMonthLabel(dayAnchor, i18n.language, 'short')} ${dayAnchor.getFullYear()}`;
    }
    return dayAnchor.toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [dayAnchor, i18n.language]);

  const dentistColumns = useMemo(
    () =>
      dentists.map((d) => ({
        key: `dentist-${d.id}`,
        dentistId: d.id,
        staffId: d.staff?.id ?? null,
        label: d.staff
          ? `Dr. ${(d.staff.surname ?? d.staff.name ?? '').trim()}`
          : t('dentistUnknown'),
      })),
    [dentists, t],
  );

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const range = toApiIsoLocalDayBounds(dayAnchor);
      const token = localStorage.getItem('access_token') || '';
      const dow = apiDayOfWeekFromDate(dayAnchor);
      let workingUrl = `${API_BASE_URL}/working-hours?dayOfWeek=${dow}`;
      if (dow === 7) workingUrl = `${API_BASE_URL}/working-hours`;

      const [occupancyData, dentistsRes, blockingRes, workingRes] = await Promise.all([
        randevueService.getClinicOccupancy(range.from, range.to),
        fetch(`${API_BASE_URL}/dentist`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/blocking-hours`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(workingUrl, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const dentistsData = dentistsRes.ok ? ((await dentistsRes.json()) as DentistColumn[]) : [];
      const blockingData = blockingRes.ok ? ((await blockingRes.json()) as BlockingHourRow[]) : [];
      let workingData = workingRes.ok ? ((await workingRes.json()) as WorkingHourRow[]) : [];

      if (dow === 7) {
        workingData = workingData.filter((wh) => wh.dayOfWeek === 7);
      }

      setOccupancy(Array.isArray(occupancyData) ? occupancyData : []);
      setDentists(Array.isArray(dentistsData) ? dentistsData : []);
      setBlockingHours(Array.isArray(blockingData) ? blockingData : []);
      setWorkingHours(normalizeWorkingHourRows(Array.isArray(workingData) ? workingData : []));
    } catch {
      setLoadError(t('loadError'));
      setOccupancy([]);
      setDentists([]);
      setBlockingHours([]);
      setWorkingHours([]);
    } finally {
      setLoading(false);
    }
  }, [dayAnchor, t]);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    if (!patientId) {
      setOpenAppointments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setApptsLoading(true);
      try {
        const res = await appointmentService.getAll({ patient: patientId, limit: 200, page: 1 });
        const open = res.appointments.filter((a) => a.endDate == null);
        if (!cancelled) setOpenAppointments(open);
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

  const openRequestModal = (dentistId: number, day: Date, hour: number) => {
    const startHm = `${String(hour).padStart(2, '0')}:00`;
    const endHm = `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`;
    setFormDate(formatYmd(day));
    setFormStart(startHm);
    setFormEnd(endHm);
    setFormDentistId(dentistId);
    setNote('');
    setAppointmentChoice(openAppointments.length > 0 ? openAppointments[0].id : 'new');
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    setSubmitError(null);
    if (!patientId) {
      setSubmitError(t('patientSessionError'));
      return;
    }
    if (!formDentistId) {
      setSubmitError(t('pickDoctorError'));
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
      dentist_id: formDentistId,
    };
    if (note.trim()) body.note = note.trim();

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
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message;
      setSubmitError(
        typeof message === 'string'
          ? message
          : Array.isArray(message)
            ? message.join(', ')
            : t('patientRequestError'),
      );
    } finally {
      setSubmitBusy(false);
    }
  };

  const isToday = formatYmd(dayAnchor) === formatYmd(new Date());

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <PatientPortalShell
          userDisplayName={displayName}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        >
          <main className="relative min-h-0 flex-1 bg-[#f9fafb] px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-[1400px]">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{t('patientScheduleTitle')}</h1>
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                  {t('viewDailyDentists')}
                </span>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    setDayAnchor(d);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('today')}
                </button>
                <button
                  type="button"
                  onClick={() => setDayAnchor((d) => addDays(d, -1))}
                  className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
                  aria-label={t('prevDay')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="min-w-[12rem] text-center text-sm font-medium text-gray-800">
                  {rangeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setDayAnchor((d) => addDays(d, 1))}
                  className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
                  aria-label={t('nextDay')}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 bg-slate-500" />
                  {t('patientOccupied')}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded border border-gray-200 bg-white" />
                  {t('patientFree')}
                </span>
              </div>

              {loading ? (
                <p className="text-sm text-gray-500">{t('loading')}</p>
              ) : loadError ? (
                <p className="text-sm text-red-600">{loadError}</p>
              ) : dentistColumns.length === 0 ? (
                <p className="text-sm text-gray-500">{t('patientNoDentists')}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex min-w-[640px]">
                    <div className="w-12 shrink-0 border-r border-gray-200 bg-gray-50">
                      <div className="h-12 border-b border-gray-200" />
                      {DISPLAY_HOURS.map((h, slot) => (
                        <div
                          key={`time-${slot}-${h}`}
                          className="flex items-start justify-end border-b border-gray-100 pr-2 text-right text-xs tabular-nums text-gray-500"
                          style={{ height: HOUR_PX }}
                        >
                          {formatHourLabel24(h)}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-1">
                      {dentistColumns.map((column) => (
                        <div
                          key={column.key}
                          className="min-w-[120px] flex-1 border-r border-gray-200 last:border-r-0 xl:min-w-[130px]"
                        >
                          <div
                            className={`flex h-12 items-center justify-center border-b border-gray-200 px-2 text-center text-sm font-medium ${
                              isToday ? 'bg-violet-50 text-violet-700' : 'text-gray-800'
                            }`}
                          >
                            {column.label}
                          </div>
                          <div className="relative" style={{ height: DAY_PX }}>
                            {DISPLAY_HOURS.map((h, slot) => {
                              const staffId = column.staffId;
                              const outside =
                                staffId != null &&
                                !isStaffHourSlotWithinWorkingHours(
                                  staffId,
                                  dayAnchor,
                                  h,
                                  workingHours,
                                );
                              if (outside) {
                                return (
                                  <div
                                    key={`${column.key}-${slot}-off`}
                                    className={PATIENT_OCCUPIED_CELL}
                                    style={{ top: slot * HOUR_PX, height: HOUR_PX }}
                                    title={t('patientOccupied')}
                                    aria-hidden
                                  />
                                );
                              }
                              return (
                                <button
                                  key={`${column.key}-${slot}-free`}
                                  type="button"
                                  className="absolute inset-x-0 z-[5] cursor-pointer border-b border-gray-100 px-1 py-0.5 text-left transition-colors hover:bg-violet-50/40"
                                  style={{ top: slot * HOUR_PX, height: HOUR_PX }}
                                  onClick={() => openRequestModal(column.dentistId, dayAnchor, h)}
                                  aria-label={`${t('patientRequestSlot')} ${formatYmd(dayAnchor)} ${formatHourLabel24(h)}`}
                                />
                              );
                            })}

                            {occupancy
                              .filter(
                                (slot) =>
                                  (slot.dentistId ?? 0) === column.dentistId &&
                                  overlapsLocalDay(
                                    new Date(slot.date),
                                    new Date(slot.endTime),
                                    dayAnchor,
                                  ),
                              )
                              .flatMap((slot) => {
                                const segs = layoutSegments(
                                  dayAnchor,
                                  new Date(slot.date),
                                  new Date(slot.endTime),
                                );
                                return segs.map((seg, segIdx) => (
                                  <div
                                    key={`occ-${column.key}-${slot.date}-${segIdx}`}
                                    className={PATIENT_OCCUPIED_CELL}
                                    style={{ top: seg.top, height: seg.height }}
                                    title={t('patientOccupied')}
                                    aria-hidden
                                  />
                                ));
                              })}

                            {blockingHours
                              .filter(
                                (bh) =>
                                  bh.staffId != null &&
                                  bh.staffId === column.staffId &&
                                  overlapsLocalDay(
                                    new Date(bh.startTime),
                                    new Date(bh.endTime),
                                    dayAnchor,
                                  ),
                              )
                              .flatMap((bh) => {
                                const segs = layoutSegments(
                                  dayAnchor,
                                  new Date(bh.startTime),
                                  new Date(bh.endTime),
                                );
                                return segs.map((seg, segIdx) => (
                                  <div
                                    key={`blk-${column.key}-${bh.id}-${segIdx}`}
                                    className={PATIENT_OCCUPIED_CELL}
                                    style={{ top: seg.top, height: seg.height }}
                                    title={t('patientOccupied')}
                                    aria-hidden
                                  />
                                ));
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </PatientPortalShell>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('patientRequestTitle')}</h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">{t('date')}</span>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">{t('doctor')}</span>
                  <select
                    value={formDentistId || ''}
                    onChange={(e) => setFormDentistId(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">{t('selectDoctor')}</option>
                    {dentists.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.staff
                          ? `Dr. ${(d.staff.name ?? '')} ${(d.staff.surname ?? '')}`.trim()
                          : `#${d.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">{t('startTime')}</span>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">{t('endTime')}</span>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">{t('openAppointments')}</p>
                {apptsLoading ? (
                  <p className="text-sm text-gray-500">{t('loading')}</p>
                ) : (
                  <div className="space-y-2">
                    {openAppointments.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('noOpenAppointments')}</p>
                    ) : null}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="apptChoice"
                        checked={appointmentChoice === 'new'}
                        onChange={() => setAppointmentChoice('new')}
                      />
                      {t('newAppointment')}
                    </label>
                    {openAppointments.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="apptChoice"
                          checked={appointmentChoice === a.id}
                          onChange={() => setAppointmentChoice(a.id)}
                        />
                        {`${t('linkAppointment')} — ${formatYmdDisplay(a.startDate)}`}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">{t('note')}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder={t('patientNotePlaceholder')}
                />
              </label>

              {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={submitBusy}
                onClick={() => void handleSubmitRequest()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {submitBusy ? t('creating') : t('patientRequestSubmit')}
              </button>
            </div>
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

export default PatientSchedule;
