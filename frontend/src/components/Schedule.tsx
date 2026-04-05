import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './Header';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  appointmentService,
  patientService,
  randevueService,
  type Appointment,
  type CreatePatientDto,
  type CreateRandevueDto,
  type Patient,
  type Randevue,
} from '../services/api';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 48;
const DAY_PX = HOURS.length * HOUR_PX;

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

function layoutSegment(
  day: Date,
  start: Date,
  end: Date,
): { top: number; height: number } | null {
  const { start: ds, next: dn } = dayBoundsLocal(day);
  if (end <= ds || start >= dn) return null;
  const visStart = start > ds ? start : ds;
  const visEnd = end < dn ? end : dn;
  if (visEnd <= visStart) return null;
  const dayMs = dn.getTime() - ds.getTime();
  const top = ((visStart.getTime() - ds.getTime()) / dayMs) * DAY_PX;
  const height = ((visEnd.getTime() - visStart.getTime()) / dayMs) * DAY_PX;
  return { top, height: Math.max(height, 20) };
}

const Schedule = () => {
  const { t, i18n } = useTranslation('schedule');
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [randevues, setRandevues] = useState<Randevue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
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

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const rangeLabel = useMemo(() => {
    const a = days[0];
    const b = days[6];
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const y = a.getFullYear() !== b.getFullYear();
    const left = a.toLocaleDateString(i18n.language, y ? { ...opts, year: 'numeric' } : opts);
    const right = b.toLocaleDateString(i18n.language, { ...opts, year: 'numeric' });
    return `${left} – ${right}`;
  }, [days, i18n.language]);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { from, to } = weekRangeIso(weekAnchor);
      const data = await randevueService.getForRange(from, to);
      setRandevues(data);
    } catch {
      setLoadError(t('loadError'));
      setRandevues([]);
    } finally {
      setLoading(false);
    }
  }, [weekAnchor, t]);

  useEffect(() => {
    void fetchWeek();
  }, [fetchWeek]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

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

  const openNewModal = (day?: Date, hour?: number) => {
    const baseDay = day ?? new Date();
    setFormDate(formatYmd(baseDay));
    setFormStart(hour != null ? `${String(hour).padStart(2, '0')}:00` : '09:00');
    setFormEnd(hour != null ? `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00` : '10:00');
    setNote('');
    setPatientId(0);
    setAppointmentChoice('none');
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
      void fetchWeek();
    } catch {
      setSubmitError(t('createError'));
    } finally {
      setSubmitBusy(false);
    }
  };

  const formatHour = (h: number) =>
    new Date(2000, 0, 1, h, 0).toLocaleTimeString(i18n.language, {
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              onClick={() => setWeekAnchor(startOfWeekMonday(new Date()))}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {t('today')}
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, -7))}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              aria-label={t('prevWeek')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor((w) => addDays(w, 7))}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              aria-label={t('nextWeek')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
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
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="text-xs text-gray-500 pr-2 text-right border-b border-gray-100 flex items-start justify-end"
                    style={{ height: HOUR_PX }}
                  >
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              <div className="flex flex-1">
                {days.map((day) => {
                  const header = day.toLocaleDateString(i18n.language, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  const isToday = formatYmd(day) === formatYmd(new Date());

                  return (
                    <div key={day.toISOString()} className="flex-1 min-w-[100px] border-r border-gray-200 last:border-r-0">
                      <div
                        className={`h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium ${
                          isToday ? 'text-violet-700 bg-violet-50' : 'text-gray-800'
                        }`}
                      >
                        {header}
                      </div>
                      <div className="relative" style={{ height: DAY_PX }}>
                        {HOURS.map((h) => (
                          <button
                            key={h}
                            type="button"
                            className="absolute left-0 right-0 border-b border-gray-100 hover:bg-violet-50/40 transition-colors cursor-pointer"
                            style={{ top: h * HOUR_PX, height: HOUR_PX }}
                            onClick={() => openNewModal(day, h)}
                            aria-label={`${t('newRandevue')} ${formatYmd(day)} ${h}:00`}
                          />
                        ))}

                        {randevues.map((r) => {
                          const s = new Date(r.date);
                          const e = new Date(r.endTime);
                          const seg = layoutSegment(day, s, e);
                          if (!seg) return null;
                          return (
                            <div
                              key={`${r.id}-${day.toISOString()}`}
                              className="absolute left-0.5 right-0.5 rounded-md bg-violet-500 text-white text-xs px-1 py-0.5 shadow-sm overflow-hidden z-10 pointer-events-none"
                              style={{ top: seg.top, height: seg.height }}
                              title={`${r.patient.name} ${r.patient.surname}`}
                            >
                              <span className="font-semibold leading-tight block truncate">
                                {r.patient.name} {r.patient.surname}
                              </span>
                            </div>
                          );
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

              {showNewPatient && (
                <div className="border border-violet-100 rounded-lg p-3 bg-violet-50/50 space-y-2">
                  <input
                    placeholder={t('newPatientName')}
                    value={newPatient.name}
                    onChange={(e) => setNewPatient((x) => ({ ...x, name: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder={t('newPatientSurname')}
                    value={newPatient.surname}
                    onChange={(e) => setNewPatient((x) => ({ ...x, surname: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={newPatient.birthDate}
                    onChange={(e) => setNewPatient((x) => ({ ...x, birthDate: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
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
