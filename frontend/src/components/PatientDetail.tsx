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
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Package,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import Header from './Header';
import TeethDiagram from './TeethDiagram';
import { appointmentService, patientService, toothTreatmentService } from '../services/api';
import type { Appointment, Patient, PatientTooth, ToothTreatment } from '../services/api';
import { useTranslation } from 'react-i18next';

const directorMenuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', icon: UserRound, path: '/patients' },
  { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { label: 'Inventory', icon: Package, path: '/medicines' },
  { label: 'Staff/Doctors', icon: Users, path: '/settings' },
  { label: 'Finance', icon: Wallet, path: '/appointments' },
];

const directorFooterItems = [
  { label: 'Help', icon: CircleHelp },
  { label: 'Logout', icon: LogOut },
];

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('patientDetail');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientTeeth, setPatientTeeth] = useState<PatientTooth[]>([]);
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

  const [patientPanel, setPatientPanel] = useState<'teeth' | 'appointments'>('teeth');
  const [appointmentScope, setAppointmentScope] = useState<'active' | 'past'>('active');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<ToothTreatment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';
  const patientsNavActive = location.pathname.startsWith('/patients');

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
        const [patientData, teethData] = await Promise.all([
          patientService.getById(parseInt(id)),
          patientService.getPatientTeeth(parseInt(id)),
        ]);
        setPatient(patientData);
        setPatientTeeth(teethData);
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

  const treatmentsByAppointmentId = useMemo(() => {
    const map = new Map<number, ToothTreatment[]>();
    for (const tt of patientTreatments) {
      const aid = tt.appointment?.id;
      if (aid == null) continue;
      const list = map.get(aid) ?? [];
      list.push(tt);
      map.set(aid, list);
    }
    return map;
  }, [patientTreatments]);

  const filteredAppointments = useMemo(() => {
    const list = patientAppointments.filter((a) =>
      appointmentScope === 'active' ? a.endDate == null : a.endDate != null,
    );
    return [...list].sort((a, b) => {
      const ta = new Date(a.startDate).getTime();
      const tb = new Date(b.startDate).getTime();
      return tb - ta;
    });
  }, [patientAppointments, appointmentScope]);

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

  const wrapLayout = (children: ReactNode) => {
    if (isDirector) {
      return (
        <div className="min-h-screen bg-[#f4f6f8] text-slate-700">
          <header className="h-16 border-b border-slate-200 bg-white px-6">
            <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                  aria-label={isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
                >
                  {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
                <span className="text-sm font-semibold text-slate-900">Clinic Management</span>
              </div>
            </div>
          </header>
          <div className="mx-auto flex max-w-[1600px]">
            <aside
              className={`relative border-r border-slate-200 bg-[#f0f3f7] transition-all duration-300 ${
                isSidebarOpen ? 'w-64' : 'w-20'
              }`}
            >
              <div className="flex h-[calc(100vh-4rem)] flex-col justify-between py-6">
                <nav className="space-y-1 px-3">
                  {directorMenuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                        item.path === '/patients' && patientsNavActive
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
            <main className="relative h-[calc(100vh-4rem)] flex-1 overflow-auto bg-[#f9fafb] px-6 py-6">
              {children}
            </main>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f4f6f8]">
        <Header />
        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
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
          <TeethDiagram patientId={patient.id} patientTeeth={patientTeeth} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
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
            </div>

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

            {!appointmentsLoading && !appointmentsError && filteredAppointments.length > 0 && (
              <ul className="space-y-4">
                {filteredAppointments.map((appt) => {
                  const treatments = treatmentsByAppointmentId.get(appt.id) ?? [];
                  return (
                    <li key={appt.id}>
                      <Link
                        to={`/appointments/${appt.id}`}
                        state={{ fromPatientId: patient.id }}
                        className="block rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-[#0066A6] hover:bg-[#f0f7fc]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066A6] focus-visible:ring-offset-2"
                      >
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="mr-1 text-slate-500">{t('startDate')}:</span>
                            <span className="font-medium text-slate-900">{appt.startDate}</span>
                          </div>
                          <div>
                            <span className="mr-1 text-slate-500">{t('chargedPrice')}:</span>
                            <span className="font-medium text-slate-900">{formatChargedPrice(appt)}</span>
                          </div>
                        </div>
                        {treatments.length > 0 && (
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('treatments')}
                            </p>
                            <ul className="space-y-2">
                              {treatments.map((tt) => (
                                <li key={tt.id} className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-800">
                                  <span className="font-medium">{tt.treatment?.name ?? '—'}</span>
                                  <span className="text-slate-500">
                                    {t('toothNumbers')}: {formatToothList(tt)}
                                  </span>
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
