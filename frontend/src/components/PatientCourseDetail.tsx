import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  appointmentService,
  patientService,
  toothTreatmentService,
  type Appointment,
  type ToothTreatment,
} from '../services/api';
import { getPatientId, isPatientSession } from '../lib/patientSession';
import { PatientPortalShell } from './PatientPortalShell';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

const COURSES_PATH = '/course-of-treatments';

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function formatDentistName(appointment: Appointment): string {
  const d = appointment.dentist;
  if (!d) return '—';
  const name = `${d.name ?? ''} ${d.surname ?? ''}`.trim();
  return name || `#${d.id}`;
}

function formatTreatmentDentist(tt: ToothTreatment, unknownLabel: string): string {
  const d = tt.dentist;
  if (!d?.id) return unknownLabel;
  const name = `${d.staff?.name ?? ''} ${d.staff?.surname ?? ''}`.trim();
  return name || `#${d.id}`;
}

function formatToothList(tt: ToothTreatment): string {
  const toothIds = (tt.toothTreatmentTeeth ?? [])
    .map((x) => x.toothId)
    .filter((n): n is number => n != null && !Number.isNaN(n));
  if (toothIds.length === 0 && tt.tooth != null) {
    toothIds.push(tt.tooth);
  }
  const unique = [...new Set(toothIds)].sort((a, b) => a - b);
  return unique.length ? unique.join(', ') : '—';
}

export default function PatientCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('courseOfTreatments');
  const { t: tPatient } = useTranslation('patientDetail');
  const patientId = getPatientId();
  const courseId = id ? parseInt(id, 10) : NaN;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [treatments, setTreatments] = useState<ToothTreatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? COURSES_PATH;
  const returnLabel =
    (location.state as { returnLabel?: string } | null)?.returnLabel ?? t('backLabel');

  useEffect(() => {
    if (!patientId || !Number.isFinite(courseId) || courseId <= 0) return;

    void patientService
      .getById(patientId)
      .then((p) => setUserDisplayName(`${p.name} ${p.surname}`.trim()))
      .catch(() => setUserDisplayName(''));

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [apptRes, treatmentList] = await Promise.all([
          appointmentService.getAll({ id: courseId }),
          toothTreatmentService.getAll({ appointment: courseId }),
        ]);
        const found = apptRes.appointments?.[0] ?? null;
        if (!found) {
          setError(t('courseNotFound'));
          setAppointment(null);
          setTreatments([]);
          return;
        }
        setAppointment(found);
        setTreatments(treatmentList);
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message ?? t('errLoadCourseDetail'));
        setAppointment(null);
        setTreatments([]);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [patientId, courseId, t]);

  if (!isPatientSession() || !patientId) {
    return <Navigate to="/patient/login" replace />;
  }

  if (!Number.isFinite(courseId) || courseId <= 0) {
    return <Navigate to={COURSES_PATH} replace />;
  }

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <PatientPortalShell
          userDisplayName={userDisplayName}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-5">
              <button
                type="button"
                onClick={() => navigate(returnTo)}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0066A6] transition hover:text-[#00588f]"
              >
                <ArrowLeft size={16} />
                {returnLabel}
              </button>

              {isLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">{t('loadingCourseDetail')}</p>
              ) : error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : appointment ? (
                <>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('courseDetailTitle')}</h1>
                    <p className="text-sm text-slate-500">
                      {appointment.startDate}
                      {appointment.endDate ? ` — ${appointment.endDate}` : ''}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('tableStartDate')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{appointment.startDate}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('tableEndDate')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {appointment.endDate ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('tableDentist')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {formatDentistName(appointment)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('treatments')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {appointment.treatmentCount ?? treatments.length}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('calculated')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {formatMoney(appointment.calculatedFee)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('charged')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {formatMoney(appointment.chargedFee)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('discount')}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {formatMoney(appointment.discountFee)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {tPatient('treatments')}
                    </h2>
                    {treatments.length === 0 ? (
                      <p className="text-sm text-slate-500">{t('noTreatmentsInCourse')}</p>
                    ) : (
                      <ul className="space-y-4">
                        {treatments.map((tt) => (
                          <li
                            key={tt.id}
                            className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-800"
                          >
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span className="font-medium">{tt.treatment?.name ?? '—'}</span>
                              <span className="text-slate-500">
                                {tPatient('toothNumbers')}: {formatToothList(tt)}
                              </span>
                              <span className="text-slate-500">
                                {tPatient('dentist')}:{' '}
                                {formatTreatmentDentist(tt, tPatient('unknownDentist'))}
                              </span>
                              {tt.feeSnapshot > 0 ? (
                                <span className="text-slate-500">
                                  {t('calculated')}: {formatMoney(tt.feeSnapshot)}
                                </span>
                              ) : null}
                            </div>
                            {tt.description?.trim() ? (
                              <p className="mt-2 text-xs text-slate-600">
                                <span className="font-semibold text-slate-500">
                                  {tPatient('treatmentNotes')}:{' '}
                                </span>
                                {tt.description.trim()}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </main>
        </PatientPortalShell>
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
