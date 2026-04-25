import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  Edit,
  X,
  Globe,
  Smile,
  CalendarDays,
  Trash2,
} from 'lucide-react';
import Header from './Header';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import TeethDiagram from './TeethDiagram';
import { appointmentService, dentistService, patientService, toothTreatmentService } from '../services/api';
import type { Appointment, Patient, PatientTooth, ToothTreatment } from '../services/api';
import { useTranslation } from 'react-i18next';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('patientDetail');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientTeeth, setPatientTeeth] = useState<PatientTooth[]>([]);
  const [diagramTreatments, setDiagramTreatments] = useState<ToothTreatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFields, setEditFields] = useState({ name: '', surname: '', birthDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [patientPanel, setPatientPanel] = useState<'teeth' | 'appointments'>('teeth');
  const [appointmentScope, setAppointmentScope] = useState<'active' | 'past'>('active');
  const [appointmentTreatmentsView, setAppointmentTreatmentsView] = useState<'byAppointment' | 'byDoctor'>(
    'byAppointment',
  );
  const [dentistFilterId, setDentistFilterId] = useState(0);
  const [appointmentDentistScope, setAppointmentDentistScope] = useState<'mine' | 'all'>('mine');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<ToothTreatment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';
  const isDentist = role === 'dentist';
  const loggedInDentistId = useMemo(() => {
    const raw = localStorage.getItem('dentistId');
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);
  const [dentistPortalDisplayName, setDentistPortalDisplayName] = useState('');

  const FETCH_ERROR_KEY = '__fetch_error__';
  const UPDATE_ERROR_KEY = '__update_error__';
  const DELETE_ERROR_KEY = '__delete_error__';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!id) return;

      setIsLoading(true);
      setFetchError(null);
      try {
        const pid = parseInt(id, 10);
        const [patientData, teethData, diagramTt] = await Promise.all([
          patientService.getById(pid),
          patientService.getPatientTeeth(pid),
          toothTreatmentService.getAll({ patient: pid }).catch(() => [] as ToothTreatment[]),
        ]);
        setPatient(patientData);
        setPatientTeeth(teethData);
        setDiagramTreatments(Array.isArray(diagramTt) ? diagramTt : []);
        setFormError(null);
      } catch (err: any) {
        console.error('Failed to fetch patient data:', err);
        setFetchError(err.response?.data?.message || FETCH_ERROR_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  useEffect(() => {
    if (!patient || patientPanel !== 'appointments') return;

    let cancelled = false;
    const load = async () => {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      try {
        const [apptsRes, treatments] = await Promise.all([
          appointmentService.getAll({ patient: patient.id }),
          toothTreatmentService.getAll({ patient: patient.id }),
        ]);
        if (cancelled) return;
        setPatientAppointments(apptsRes.appointments);
        setPatientTreatments(treatments);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Failed to load patient appointments:', err);
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setAppointmentsError(message || 'appointmentsLoadError');
      } finally {
        if (!cancelled) setAppointmentsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [patient, patientPanel]);

  useEffect(() => {
    if (isDirector) {
      setDentistFilterId(0);
    }
  }, [appointmentScope, isDirector]);

  useEffect(() => {
    if (!isDentist) {
      setDentistPortalDisplayName('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      if (loggedInDentistId <= 0) return;
      try {
        const profile = await dentistService.getById(loggedInDentistId);
        const label = `${profile?.staff?.name ?? ''} ${profile?.staff?.surname ?? ''}`.trim();
        if (!cancelled) setDentistPortalDisplayName(label || `Dentist #${loggedInDentistId}`);
      } catch {
        if (!cancelled) setDentistPortalDisplayName('');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isDentist, loggedInDentistId]);

  const filteredAppointments = useMemo(() => {
    const list = isDentist
      ? [...patientAppointments]
      : patientAppointments.filter((a) =>
          appointmentScope === 'active' ? a.endDate == null : a.endDate != null,
        );
    return list.sort((a, b) => {
      const ta = new Date(a.startDate).getTime();
      const tb = new Date(b.startDate).getTime();
      return tb - ta;
    });
  }, [patientAppointments, appointmentScope, isDentist]);

  const effectiveDentistTreatmentFilter = useMemo(() => {
    if (isDentist) {
      return appointmentDentistScope === 'mine' ? loggedInDentistId : 0;
    }
    return dentistFilterId;
  }, [appointmentDentistScope, dentistFilterId, isDentist, loggedInDentistId]);

  const appointmentScopeIds = useMemo(
    () => new Set(filteredAppointments.map((a) => a.id)),
    [filteredAppointments],
  );

  const scopeTreatments = useMemo(
    () =>
      patientTreatments.filter(
        (tt) => tt.appointment?.id != null && appointmentScopeIds.has(tt.appointment.id),
      ),
    [patientTreatments, appointmentScopeIds],
  );

  const visibleTreatments = useMemo(
    () =>
      effectiveDentistTreatmentFilter > 0
        ? scopeTreatments.filter((tt) => tt.dentist?.id === effectiveDentistTreatmentFilter)
        : scopeTreatments,
    [scopeTreatments, effectiveDentistTreatmentFilter],
  );

  const treatmentsByAppointmentId = useMemo(() => {
    const map = new Map<number, ToothTreatment[]>();
    for (const tt of visibleTreatments) {
      const aid = tt.appointment?.id;
      if (aid == null) continue;
      const list = map.get(aid) ?? [];
      list.push(tt);
      map.set(aid, list);
    }
    return map;
  }, [visibleTreatments]);

  const appointmentsToDisplay = useMemo(() => {
    if (effectiveDentistTreatmentFilter === 0) return filteredAppointments;
    const ids = new Set(visibleTreatments.map((tt) => tt.appointment!.id));
    return filteredAppointments.filter((a) => ids.has(a.id));
  }, [filteredAppointments, effectiveDentistTreatmentFilter, visibleTreatments]);

  const dentistFilterOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const tt of scopeTreatments) {
      const d = tt.dentist;
      if (!d?.id) continue;
      const label = `${d.staff?.name ?? ''} ${d.staff?.surname ?? ''}`.trim();
      if (!m.has(d.id)) m.set(d.id, label || `#${d.id}`);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [scopeTreatments]);

  const treatmentsGroupedByDoctor = useMemo(() => {
    type Row = { date: string; items: ToothTreatment[] };
    type Block = { dentistKey: string; dentistId: number | null; isUnknown: boolean; dentistLabel: string; rows: Row[] };
    const blockMap = new Map<string, Block>();

    for (const tt of visibleTreatments) {
      const d = tt.dentist;
      const isUnknown = !d?.id;
      const dentistKey = d?.id != null ? `id-${d.id}` : 'unknown';
      const dentistLabel = d ? `${d.staff?.name ?? ''} ${d.staff?.surname ?? ''}`.trim() || `#${d.id}` : '';
      const date = tt.appointment?.startDate ?? '—';

      let block = blockMap.get(dentistKey);
      if (!block) {
        block = {
          dentistKey,
          dentistId: d?.id ?? null,
          isUnknown,
          dentistLabel,
          rows: [],
        };
        blockMap.set(dentistKey, block);
      }
      let row = block.rows.find((r) => r.date === date);
      if (!row) {
        row = { date, items: [] };
        block.rows.push(row);
      }
      row.items.push(tt);
    }

    for (const block of blockMap.values()) {
      block.rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      for (const row of block.rows) {
        row.items.sort((a, b) => a.id - b.id);
      }
    }

    const blocks = [...blockMap.values()].sort((a, b) => {
      if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
      return a.dentistLabel.localeCompare(b.dentistLabel);
    });

    return blocks;
  }, [visibleTreatments]);

  const formatChargedPrice = (a: Appointment) => {
    const fee = a.chargedFee ?? a.calculatedFee;
    if (fee == null) return '—';
    return `$${Number(fee).toFixed(2)}`;
  };

  const formatToothList = (tt: ToothTreatment) => {
    const toothIds = (tt.toothTreatmentTeeth ?? [])
      .map((x) => x.toothId)
      .filter((n): n is number => n != null && !Number.isNaN(n));
    if (toothIds.length === 0 && tt.tooth != null) {
      toothIds.push(tt.tooth);
    }

    const toothNumbers = toothIds
      .map((tid) => patientTeeth.find((pt) => pt.tooth === tid)?.toothNumber)
      .filter((n): n is number => n != null && !Number.isNaN(n));

    const unique = [...new Set(toothNumbers)].sort((x, y) => x - y);
    return unique.length ? unique.join(', ') : '—';
  };

  const formatToothTreatmentLine = (tt: ToothTreatment) =>
    `${formatToothList(tt)} — ${tt.treatment?.name ?? '—'}`;

  const wrapLayout = (children: ReactNode) => {
    if (isDirector || isDentist) {
      return (
        <>
          <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
            <ClinicPortalShell
              brandTitle="Clinic Management"
              portalBadge={isDirector ? undefined : 'Dentist Portal'}
              userDisplayName={isDentist ? dentistPortalDisplayName : ''}
              userSubtitle={isDirector ? 'Clinic Director' : 'Dentist'}
              menuItems={isDirector ? DIRECTOR_PORTAL_MENU : DENTIST_PORTAL_MENU}
              pathname={location.pathname}
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              navigate={navigate}
              onLogoutClick={() => setShowLogoutConfirm(true)}
              showProfileStrip={isDentist}
            >
              <main className="relative min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">{children}</main>
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
    }

    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#f4f6f8]">
        <Header />
        <main className="relative mx-auto min-h-0 flex-1 max-w-7xl overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  };

  if (isLoading) {
    return wrapLayout(
      <div className="py-12 text-center">
        <p className="text-slate-500">{t('loading')}</p>
      </div>,
    );
  }

  if (!patient) {
    return wrapLayout(
      <>
        <button
          onClick={() => navigate('/patients')}
          className="mb-6 flex items-center space-x-2 text-[#0066A6] transition-colors hover:text-[#00588f]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>{t('back')}</span>
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {fetchError ? (fetchError === FETCH_ERROR_KEY ? t('fetchError') : fetchError) : t('notFound')}
        </div>
      </>,
    );
  }

  return wrapLayout(
    <>
      <div className="absolute right-4 top-4 z-10" ref={languageMenuRef}>
        <button
          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          className="rounded-lg bg-white/90 p-2 shadow-sm transition-colors hover:bg-white"
          aria-label="Change language"
        >
          <Globe className="h-5 w-5 text-slate-600" />
        </button>
        {showLanguageMenu && (
          <div className="absolute right-0 top-12 z-50 min-w-[120px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <button
              onClick={() => {
                i18n.changeLanguage('en');
                setShowLanguageMenu(false);
              }}
              className={`w-full px-4 py-2 text-left transition-colors hover:bg-slate-100 ${
                i18n.language === 'en' ? 'bg-[#f0f7fc] font-semibold text-[#0066A6]' : 'text-slate-700'
              }`}
            >
              English
            </button>
            <button
              onClick={() => {
                i18n.changeLanguage('az');
                setShowLanguageMenu(false);
              }}
              className={`w-full px-4 py-2 text-left transition-colors hover:bg-slate-100 ${
                i18n.language === 'az' ? 'bg-[#f0f7fc] font-semibold text-[#0066A6]' : 'text-slate-700'
              }`}
            >
              Azərbaycan
            </button>
            <button
              onClick={() => {
                i18n.changeLanguage('ru');
                setShowLanguageMenu(false);
              }}
              className={`w-full px-4 py-2 text-left transition-colors hover:bg-slate-100 ${
                i18n.language === 'ru' ? 'bg-[#f0f7fc] font-semibold text-[#0066A6]' : 'text-slate-700'
              }`}
            >
              Русский
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/patients')}
        className="mb-6 flex items-center space-x-2 font-medium text-[#0066A6] transition-colors hover:text-[#00588f]"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>{t('back')}</span>
      </button>

      <div className="mb-8 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f2fa]">
              <User className="h-10 w-10 text-[#0066A6]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {patient.name} {patient.surname}
              </h1>
            </div>
          </div>
          <button
            onClick={() => {
              setEditFields({ name: patient.name, surname: patient.surname, birthDate: patient.birthDate });
              setFormError(null);
              setShowEditModal(true);
            }}
            className="flex items-center space-x-2 rounded-md bg-[#0066A6] px-3 py-1.5 text-white transition-colors hover:bg-[#00588f]"
          >
            <Edit className="h-4 w-4" />
            <span>{t('edit')}</span>
          </button>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">{t('patientInfo')}</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex items-start space-x-3">
              <User className="mt-1 h-5 w-5 shrink-0 text-[#0066A6]" />
              <div>
                <p className="text-sm font-medium text-slate-500">{t('fullName')}</p>
                <p className="text-lg text-slate-900">
                  {patient.name} {patient.surname}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="mt-1 h-5 w-5 shrink-0 text-[#0066A6]" />
              <div>
                <p className="text-sm font-medium text-slate-500">{t('birthDate')}</p>
                <p className="text-lg text-slate-900">{patient.birthDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {patientPanel === 'teeth' ? t('teethDiagram') : t('appointments')}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPatientPanel('teeth')}
              className={`rounded-lg border p-2.5 transition-colors ${
                patientPanel === 'teeth'
                  ? 'border-[#0066A6] bg-[#f0f7fc] text-[#0066A6]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label={t('showTeethDiagram')}
              title={t('showTeethDiagram')}
            >
              <Smile className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setPatientPanel('appointments')}
              className={`rounded-lg border p-2.5 transition-colors ${
                patientPanel === 'appointments'
                  ? 'border-[#0066A6] bg-[#f0f7fc] text-[#0066A6]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              aria-label={t('showAppointments')}
              title={t('showAppointments')}
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>
        </div>

        {patientPanel === 'teeth' ? (
          <TeethDiagram patientId={patient.id} patientTeeth={patientTeeth} toothTreatments={diagramTreatments} />
        ) : (
          <div className="space-y-4">
            {isDentist ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAppointmentDentistScope('mine')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    appointmentDentistScope === 'mine'
                      ? 'bg-[#0066A6] text-white hover:bg-[#00588f]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t('appointmentsMine')}
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentDentistScope('all')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    appointmentDentistScope === 'all'
                      ? 'bg-[#0066A6] text-white hover:bg-[#00588f]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t('appointmentsAll')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAppointmentScope('active')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      appointmentScope === 'active'
                        ? 'bg-[#0066A6] text-white hover:bg-[#00588f]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('activeAppointments')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentScope('past')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      appointmentScope === 'past'
                        ? 'bg-[#0066A6] text-white hover:bg-[#00588f]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('pastAppointments')}
                  </button>
                  <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline-block" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setAppointmentTreatmentsView('byAppointment')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      appointmentTreatmentsView === 'byAppointment'
                        ? 'bg-[#0066A6] text-white hover:bg-[#00588f]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('viewByAppointment')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentTreatmentsView('byDoctor')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      appointmentTreatmentsView === 'byDoctor'
                        ? 'bg-[#0066A6] text-white hover:bg-[#00588f]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('viewByDoctor')}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label htmlFor="patient-appt-dentist-filter" className="text-sm font-medium text-slate-600">
                    {t('filterByDentist')}
                  </label>
                  <select
                    id="patient-appt-dentist-filter"
                    value={dentistFilterId || ''}
                    onChange={(e) => setDentistFilterId(Number(e.target.value) || 0)}
                    className="min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  >
                    <option value="">{t('allDentists')}</option>
                    {dentistFilterOptions.map(([did, label]) => (
                      <option key={did} value={did}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {appointmentsLoading && (
              <p className="py-6 text-center text-sm text-slate-500">{t('loading')}</p>
            )}

            {!appointmentsLoading && appointmentsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {appointmentsError === 'appointmentsLoadError' ? t('appointmentsLoadError') : appointmentsError}
              </div>
            )}

            {!appointmentsLoading && !appointmentsError && filteredAppointments.length === 0 && (
              <p className="py-4 text-sm text-slate-500">{t('noAppointments')}</p>
            )}

            {!appointmentsLoading &&
              !appointmentsError &&
              filteredAppointments.length > 0 &&
              !isDentist &&
              appointmentTreatmentsView === 'byDoctor' && (
                <div className="space-y-6 pt-2">
                  {treatmentsGroupedByDoctor.length === 0 ? (
                    <p className="py-4 text-sm text-slate-500">{t('noTreatmentsForFilter')}</p>
                  ) : (
                    treatmentsGroupedByDoctor.map((block) => (
                      <div
                        key={block.dentistKey}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100"
                      >
                        <h3 className="border-b border-[#cce0f0] pb-2 text-base font-semibold text-slate-900">
                          {block.isUnknown ? t('unknownDentist') : block.dentistLabel}
                        </h3>
                        <div className="mt-3 space-y-4">
                          {block.rows.map((row) => (
                            <div key={`${block.dentistKey}-${row.date}`}>
                              <p className="mb-2 text-sm font-medium text-[#0066A6]">{row.date}</p>
                              <ul className="space-y-1.5 border-l-2 border-[#cce0f0] pl-3">
                                {row.items.map((tt) => (
                                  <li key={tt.id}>
                                    <Link
                                      to={`/appointments/${tt.appointment!.id}`}
                                      state={{
                                        fromPatientId: patient.id,
                                        returnTo: `${location.pathname}${location.search}${location.hash}`,
                                        returnLabel: 'Back to Patient',
                                      }}
                                      className="text-sm text-slate-800 underline-offset-2 hover:text-[#0066A6] hover:underline"
                                    >
                                      {formatToothTreatmentLine(tt)}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            {!appointmentsLoading &&
              !appointmentsError &&
              appointmentsToDisplay.length > 0 &&
              (isDentist || appointmentTreatmentsView === 'byAppointment') && (
                <ul className="space-y-4">
                  {appointmentsToDisplay.map((appt) => {
                    const treatments = treatmentsByAppointmentId.get(appt.id) ?? [];
                    return (
                      <li key={appt.id}>
                        <Link
                          to={`/appointments/${appt.id}`}
                          state={{
                            fromPatientId: patient.id,
                            returnTo: `${location.pathname}${location.search}${location.hash}`,
                            returnLabel: 'Back to Patient',
                          }}
                          className="block rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-[#0066A6] hover:bg-[#f0f7fc]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066A6] focus-visible:ring-offset-2"
                        >
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            <div>
                              <span className="mr-1 text-slate-500">{t('startDate')}:</span>
                              <span className="font-medium text-slate-900">{appt.startDate}</span>
                            </div>
                            {!isDentist ? (
                              <div>
                                <span className="mr-1 text-slate-500">{t('chargedPrice')}:</span>
                                <span className="font-medium text-slate-900">{formatChargedPrice(appt)}</span>
                              </div>
                            ) : null}
                          </div>
                          {treatments.length > 0 && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t('treatments')}
                              </p>
                              <ul className="space-y-2">
                                {treatments.map((tt) => (
                                  <li key={tt.id} className="flex flex-col gap-1 text-sm text-slate-800">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                      <span className="font-medium">{tt.treatment?.name ?? '—'}</span>
                                      <span className="text-slate-500">
                                        {t('toothNumbers')}: {formatToothList(tt)}
                                      </span>
                                      <span className="text-slate-500">
                                        {t('dentist')}:{' '}
                                        {tt.dentist
                                          ? `${tt.dentist.staff?.name ?? ''} ${tt.dentist.staff?.surname ?? ''}`.trim() ||
                                            `#${tt.dentist.id}`
                                          : t('unknownDentist')}
                                      </span>
                                    </div>
                                    {tt.description?.trim() ? (
                                      <p className="pl-0 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-500">{t('treatmentNotes')}: </span>
                                        {tt.description.trim()}
                                      </p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

            {!appointmentsLoading &&
              !appointmentsError &&
              filteredAppointments.length > 0 &&
              (isDentist || appointmentTreatmentsView === 'byAppointment') &&
              appointmentsToDisplay.length === 0 && (
                <p className="py-4 text-sm text-slate-500">{t('noTreatmentsForFilter')}</p>
              )}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{t('editTitle')}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setFormError(null);
                }}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError === UPDATE_ERROR_KEY
                  ? t('updateError')
                  : formError === DELETE_ERROR_KEY
                    ? t('deleteError')
                    : formError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!id) return;
                setIsSubmitting(true);
                setFormError(null);
                try {
                  await patientService.update(parseInt(id), editFields);
                  const updated = await patientService.getById(parseInt(id));
                  setPatient(updated);
                  setShowEditModal(false);
                  setFormError(null);
                } catch (err: any) {
                  console.error('Failed to update patient:', err);
                  setFormError(err.response?.data?.message || UPDATE_ERROR_KEY);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="editName" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('form.name')}
                </label>
                <input
                  id="editName"
                  type="text"
                  required
                  value={editFields.name}
                  onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                />
              </div>

              <div>
                <label htmlFor="editSurname" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('form.surname')}
                </label>
                <input
                  id="editSurname"
                  type="text"
                  required
                  value={editFields.surname}
                  onChange={(e) => setEditFields({ ...editFields, surname: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                />
              </div>

              <div>
                <label htmlFor="editBirthDate" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('form.birthDate')}
                </label>
                <input
                  id="editBirthDate"
                  type="date"
                  required
                  value={editFields.birthDate}
                  onChange={(e) => setEditFields({ ...editFields, birthDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="flex-1 rounded-lg bg-[#0066A6] py-2 font-medium text-white transition-colors hover:bg-[#00588f] disabled:opacity-50"
                >
                  {isSubmitting ? t('updating') : t('update')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setFormError(null);
                  }}
                  disabled={isSubmitting || isDeleting}
                  className="flex-1 rounded-lg bg-slate-200 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
              </div>
              <button
                type="button"
                disabled={isSubmitting || isDeleting}
                onClick={async () => {
                  if (!id || !patient) return;
                  const confirmed = window.confirm(
                    t('confirmDelete', { name: `${patient.name} ${patient.surname}` }),
                  );
                  if (!confirmed) return;

                  setIsDeleting(true);
                  setFormError(null);
                  try {
                    await patientService.delete(parseInt(id));
                    setShowEditModal(false);
                    navigate('/patients');
                  } catch (err: any) {
                    console.error('Failed to delete patient:', err);
                    setFormError(err.response?.data?.message || DELETE_ERROR_KEY);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="w-full rounded-lg bg-red-500 py-2 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? t('deleting') : t('deletePatient')}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>,
  );
};

export default PatientDetail;
