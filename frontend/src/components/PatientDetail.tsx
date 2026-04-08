import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Edit, X, Globe, Smile, CalendarDays, Trash2 } from 'lucide-react';
import Header from './Header';
import TeethDiagram from './TeethDiagram';
import { appointmentService, patientService, toothTreatmentService } from '../services/api';
import type { Appointment, Patient, PatientTooth, ToothTreatment } from '../services/api';
import { useTranslation } from 'react-i18next';

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const [patientPanel, setPatientPanel] = useState<'teeth' | 'appointments'>('teeth');
  const [appointmentScope, setAppointmentScope] = useState<'active' | 'past'>('active');
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<ToothTreatment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

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
      .map((id) => patientTeeth.find((pt) => pt.tooth === id)?.toothNumber)
      .filter((n): n is number => n != null && !Number.isNaN(n));

    const unique = [...new Set(toothNumbers)].sort((x, y) => x - y);
    return unique.length ? unique.join(', ') : '—';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">{t('loading')}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('back')}</span>
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {fetchError
              ? (fetchError === FETCH_ERROR_KEY ? t('fetchError') : fetchError)
              : t('notFound')}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="absolute top-4 right-4" ref={languageMenuRef}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-2 rounded-lg bg-white/90 hover:bg-white transition-colors shadow-sm"
            aria-label="Change language"
          >
            <Globe className="w-5 h-5 text-gray-700" />
          </button>
          {showLanguageMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[120px] z-50">
              <button
                onClick={() => {
                  i18n.changeLanguage('en');
                  setShowLanguageMenu(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                  i18n.language === 'en' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                }`}
              >
                English
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('az');
                  setShowLanguageMenu(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                  i18n.language === 'az' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                }`}
              >
                Azərbaycan
              </button>
              <button
                onClick={() => {
                  i18n.changeLanguage('ru');
                  setShowLanguageMenu(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                  i18n.language === 'ru' ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-700'
                }`}
              >
                Русский
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/patients')}
          className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('back')}</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
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
              className="flex items-center space-x-2 px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>{t('edit')}</span>
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('patientInfo')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-teal-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('fullName')}</p>
                  <p className="text-lg text-gray-900">{patient.name} {patient.surname}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-teal-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('birthDate')}</p>
                  <p className="text-lg text-gray-900">{patient.birthDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {patientPanel === 'teeth' ? t('teethDiagram') : t('appointments')}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPatientPanel('teeth')}
                className={`p-2.5 rounded-lg border transition-colors ${
                  patientPanel === 'teeth'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label={t('showTeethDiagram')}
                title={t('showTeethDiagram')}
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setPatientPanel('appointments')}
                className={`p-2.5 rounded-lg border transition-colors ${
                  patientPanel === 'appointments'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label={t('showAppointments')}
                title={t('showAppointments')}
              >
                <CalendarDays className="w-5 h-5" />
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    appointmentScope === 'active'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('activeAppointments')}
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentScope('past')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    appointmentScope === 'past'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('pastAppointments')}
                </button>
              </div>

              {appointmentsLoading && (
                <p className="text-gray-500 text-sm py-6 text-center">{t('loading')}</p>
              )}

              {!appointmentsLoading && appointmentsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {appointmentsError === 'appointmentsLoadError' ? t('appointmentsLoadError') : appointmentsError}
                </div>
              )}

              {!appointmentsLoading && !appointmentsError && filteredAppointments.length === 0 && (
                <p className="text-gray-500 text-sm py-4">{t('noAppointments')}</p>
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
                          className="block border border-gray-200 rounded-lg p-4 bg-gray-50/80 transition-colors hover:border-teal-400 hover:bg-teal-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                        >
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="text-gray-500 mr-1">{t('startDate')}:</span>
                            <span className="font-medium text-gray-900">{appt.startDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 mr-1">{t('chargedPrice')}:</span>
                            <span className="font-medium text-gray-900">{formatChargedPrice(appt)}</span>
                          </div>
                        </div>
                        {treatments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              {t('treatments')}
                            </p>
                            <ul className="space-y-2">
                              {treatments.map((tt) => (
                                <li
                                  key={tt.id}
                                  className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-800"
                                >
                                  <span className="font-medium">{tt.treatment?.name ?? '—'}</span>
                                  <span className="text-gray-500">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('editTitle')}</h2>
                <button
                onClick={() => {
                  setShowEditModal(false);
                  setFormError(null);
                }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
                  <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.name')}
                  </label>
                  <input
                    id="editName"
                    type="text"
                    required
                    value={editFields.name}
                    onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="editSurname" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.surname')}
                  </label>
                  <input
                    id="editSurname"
                    type="text"
                    required
                    value={editFields.surname}
                    onChange={(e) => setEditFields({ ...editFields, surname: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="editBirthDate" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.birthDate')}
                  </label>
                  <input
                    id="editBirthDate"
                    type="date"
                    required
                    value={editFields.birthDate}
                    onChange={(e) => setEditFields({ ...editFields, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || isDeleting}
                    className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
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
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
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
                  className="w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? t('deleting') : t('deletePatient')}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDetail;

