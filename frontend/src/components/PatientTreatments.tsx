import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { patientService, treatmentService, type Treatment, type TreatmentFilters } from '../services/api';
import { getPatientId, isPatientSession } from '../lib/patientSession';
import { PatientPortalShell } from './PatientPortalShell';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

const ITEMS_PER_PAGE = 10;

export default function PatientTreatments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('treatments');
  const patientId = getPatientId();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [filters, setFilters] = useState<TreatmentFilters>({ name: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTreatments = async (searchFilters?: TreatmentFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await treatmentService.getAll(searchFilters);
      setTreatments(data);
      setCurrentPage(1);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message ?? t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!patientId) return;
    void patientService
      .getById(patientId)
      .then((p) => setUserDisplayName(`${p.name} ${p.surname}`.trim()))
      .catch(() => setUserDisplayName(''));
    void fetchTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const totalPages = Math.max(1, Math.ceil(treatments.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginatedTreatments = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return treatments.slice(start, start + ITEMS_PER_PAGE);
  }, [page, treatments]);

  const pricePerLabel = (p: Treatment['pricePer']) => {
    if (p === 'tooth') return t('form.pricePerTooth');
    if (p === 'chin') return t('form.pricePerChin');
    if (p === 'mouth') return t('form.pricePerMouth');
    return t('form.pricePerUnset');
  };

  if (!isPatientSession() || !patientId) {
    return <Navigate to="/patient/login" replace />;
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
            <div className="mx-auto max-w-5xl space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
                <p className="text-sm text-slate-500">{t('subtitlePatient')}</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const searchFilters: TreatmentFilters = {};
                  if (filters.name) searchFilters.name = filters.name;
                  void fetchTreatments(searchFilters);
                }}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[240px] flex-1">
                    <label htmlFor="name" className="mb-1 block text-xs text-slate-500">
                      {t('searchLabel')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={filters.name ?? ''}
                      onChange={(e) => setFilters({ name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder={t('searchPlaceholder')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00588f] disabled:opacity-50"
                    >
                      <Search size={14} />
                      {t('search')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters({ name: '' });
                        void fetchTreatments();
                      }}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {t('clear')}
                    </button>
                  </div>
                </div>
              </form>

              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">{t('table.name')}</th>
                        <th className="px-4 py-3 text-left">{t('table.description')}</th>
                        <th className="px-4 py-3 text-left">{t('table.price')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            {t('loading')}
                          </td>
                        </tr>
                      ) : paginatedTreatments.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            {t('empty')}
                          </td>
                        </tr>
                      ) : (
                        paginatedTreatments.map((treatment) => (
                          <tr key={treatment.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-[#0066A6]">{treatment.name}</td>
                            <td className="px-4 py-3 text-slate-600">{treatment.description || '—'}</td>
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium text-slate-900 whitespace-nowrap">
                                {treatment.price.toFixed(2)} USD
                              </p>
                              <p className="text-xs text-slate-500">{pricePerLabel(treatment.pricePer)}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {!isLoading && treatments.length > 0 && totalPages > 1 ? (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                    <p className="text-slate-500">
                      {t('pagination.showing', {
                        from: (page - 1) * ITEMS_PER_PAGE + 1,
                        to: Math.min(page * ITEMS_PER_PAGE, treatments.length),
                        total: treatments.length,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t('pagination.previous')}
                      </button>
                      <span className="text-slate-600">
                        {t('pagination.page', { current: page, total: totalPages })}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t('pagination.next')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
