import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign, Globe, X, User } from 'lucide-react';
import Header from './Header';
import { toothTreatmentService, toothService, mediaService, dentistService } from '../services/api';
import type { ToothTreatment, ToothInfo, Media } from '../services/api';
import { useTranslation } from 'react-i18next';
import { ClinicPortalShell } from './ClinicPortalShell';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';

const ToothDetail = () => {
  const { patientId, toothId } = useParams<{ patientId: string; toothId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('toothDetail');
  const [isLoading, setIsLoading] = useState(true);
  const [treatments, setTreatments] = useState<ToothTreatment[]>([]);
  const [toothInfo, setToothInfo] = useState<ToothInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [treatmentMedias, setTreatmentMedias] = useState<Map<number, Media[]>>(new Map());
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dentistPortalDisplayName, setDentistPortalDisplayName] = useState('');

  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isDirector = role === 'director';
  const isDentist = role === 'dentist';
  const isPortal = isDirector || isDentist;
  const loggedInDentistId = useMemo(() => {
    const raw = localStorage.getItem('dentistId');
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, []);

  const FETCH_ERROR_KEY = '__tooth_fetch_error__';
  const languageMap: Record<string, string> = {
    en: 'english',
    az: 'azerbaijani',
    ru: 'russian',
  };

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
    if (!previewMedia) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewMedia(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewMedia]);

  useEffect(() => {
    const fetchData = async () => {
      if (!toothId || !patientId) return;

      setIsLoading(true);
      setError(null);
      try {
        const languageParam = languageMap[i18n.language] || 'english';
        const [treatmentsData, toothData] = await Promise.all([
          toothTreatmentService.getAll({ tooth: parseInt(toothId, 10), patient: parseInt(patientId, 10) }),
          toothService.getAll({ id: parseInt(toothId, 10), language: languageParam }),
        ]);
        setTreatments(treatmentsData);
        if (toothData.length > 0) {
          setToothInfo(toothData[0]);
        }

        const mediasMap = new Map<number, Media[]>();
        for (const treatment of treatmentsData) {
          try {
            const mediaResult = await mediaService.getAll({ tooth_treatment_id: treatment.id });
            mediasMap.set(treatment.id, mediaResult.medias);
          } catch (err) {
            console.error(`Failed to fetch media for treatment ${treatment.id}:`, err);
            mediasMap.set(treatment.id, []);
          }
        }
        setTreatmentMedias(mediasMap);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.message || FETCH_ERROR_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toothId, patientId, i18n.language]);

  const accent = isPortal ? 'text-[#0066A6]' : 'text-teal-600';
  const accentHover = isPortal ? 'hover:text-[#00588f]' : 'hover:text-teal-700';
  const cardClass = isPortal
    ? 'rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100'
    : 'rounded-lg bg-white shadow-md p-6 hover:shadow-lg transition-shadow';
  const muted = isPortal ? 'text-slate-500' : 'text-gray-500';
  const textMain = isPortal ? 'text-slate-900' : 'text-gray-900';
  const textBody = isPortal ? 'text-slate-700' : 'text-gray-700';
  const borderSubtle = isPortal ? 'border-slate-200' : 'border-gray-200';

  const languageMenu = (
    <div className="absolute right-4 top-4 z-10" ref={languageMenuRef}>
      <button
        type="button"
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        className={`rounded-lg p-2 shadow-sm transition-colors ${
          isPortal ? 'bg-white/90 hover:bg-white text-slate-600' : 'bg-white/90 hover:bg-white text-gray-700'
        }`}
        aria-label="Change language"
      >
        <Globe className="h-5 w-5" />
      </button>
      {showLanguageMenu && (
        <div
          className={`absolute right-0 top-12 z-50 min-w-[120px] overflow-hidden rounded-lg border shadow-lg ${
            isPortal ? 'border-slate-200 bg-white' : 'border-gray-200 bg-white'
          }`}
        >
          {(['en', 'az', 'ru'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                i18n.changeLanguage(code);
                setShowLanguageMenu(false);
              }}
              className={`w-full px-4 py-2 text-left transition-colors hover:bg-slate-100 ${
                i18n.language === code
                  ? isPortal
                    ? 'bg-[#f0f7fc] font-semibold text-[#0066A6]'
                    : 'bg-teal-50 font-semibold text-teal-700'
                  : isPortal
                    ? 'text-slate-700'
                    : 'text-gray-700'
              }`}
            >
              {code === 'en' ? 'English' : code === 'az' ? 'Azərbaycan' : 'Русский'}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const treatmentsSection =
    treatments.length === 0 ? (
      <div className={isPortal ? 'rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100' : 'rounded-lg bg-white p-8 text-center shadow-md'}>
        <p className={muted}>{t('noTreatments')}</p>
      </div>
    ) : (
      <div className="space-y-4">
        {treatments.map((treatment) => (
          <div key={treatment.id} className={cardClass}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex items-start space-x-3">
                <Calendar className={`mt-1 h-5 w-5 shrink-0 ${accent}`} />
                <div>
                  <p className={`text-sm font-medium ${muted}`}>{t('appointmentDate')}</p>
                  <p className={`text-lg font-semibold ${textMain}`}>{treatment.appointment.startDate}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <FileText className={`mt-1 h-5 w-5 shrink-0 ${accent}`} />
                <div>
                  <p className={`text-sm font-medium ${muted}`}>{t('treatment')}</p>
                  <p className={`text-lg font-semibold ${textMain}`}>{treatment.treatment.name}</p>
                </div>
              </div>

              {treatment.dentist?.staff ? (
                <div className="flex items-start space-x-3">
                  <User className={`mt-1 h-5 w-5 shrink-0 ${accent}`} />
                  <div>
                    <p className={`text-sm font-medium ${muted}`}>{t('performedBy')}</p>
                    <p className={`text-lg font-semibold ${textMain}`}>
                      {treatment.dentist.staff.name} {treatment.dentist.staff.surname}
                      <span className={`ml-2 text-sm font-normal ${muted}`}>
                        (
                        {(() => {
                          const r = treatment.dentist?.staff?.role?.toLowerCase() ?? '';
                          if (r === 'director' || r.includes('director')) return t('roleDirector');
                          if (r === 'dentist' || r.includes('dentist')) return t('roleDentist');
                          return t('roleClinician');
                        })()}
                        )
                      </span>
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDentist ? (
                <div className="flex items-start space-x-3">
                  <DollarSign className={`mt-1 h-5 w-5 shrink-0 ${accent}`} />
                  <div>
                    <p className={`text-sm font-medium ${muted}`}>{t('price')}</p>
                    <p className={`text-lg font-semibold ${textMain}`}>${treatment.treatment.price.toFixed(2)}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start space-x-3">
                <FileText className={`mt-1 h-5 w-5 shrink-0 ${accent}`} />
                <div>
                  <p className={`text-sm font-medium ${muted}`}>{t('treatmentDescription')}</p>
                  <p className={`text-base ${textBody}`}>{treatment.treatment.description || t('notAvailable')}</p>
                </div>
              </div>
            </div>

            {treatment.description && (
              <div className={`mt-4 border-t pt-4 ${borderSubtle}`}>
                <p className={`mb-1 text-sm font-medium ${muted}`}>{t('notes')}</p>
                <p className={`text-base ${textBody}`}>{treatment.description}</p>
              </div>
            )}

            {(() => {
              const medias = treatmentMedias.get(treatment.id) || [];
              return medias.length > 0 ? (
                <div className={`mt-4 border-t pt-4 ${borderSubtle}`}>
                  <p className={`mb-3 text-sm font-medium ${muted}`}>{t('treatmentImages') || 'Treatment Images'}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {medias.map((media) => (
                      <div
                        key={media.id}
                        className="group relative cursor-zoom-in overflow-hidden rounded-md border border-gray-300"
                        onClick={() => setPreviewMedia(media)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setPreviewMedia(media);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <img
                          src={media.photo_url}
                          alt={media.name}
                          className="h-32 w-full bg-gray-200 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/60">
                          <p className="text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {t('view') || 'View'}
                          </p>
                        </div>
                        <p className="mt-1 truncate px-1 text-xs text-gray-600" title={media.name}>
                          {media.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        ))}
      </div>
    );

  const previewOverlay = previewMedia ? (
    <div className="fixed inset-0 z-[200] bg-black/95" onClick={() => setPreviewMedia(null)}>
      <div className="flex h-full w-full flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 text-white">
          <h3 className="truncate pr-3 text-sm font-semibold sm:text-base">{previewMedia.name}</h3>
          <button
            type="button"
            onClick={() => setPreviewMedia(null)}
            className="text-white/80 transition-colors hover:text-white"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6">
          <img
            src={previewMedia.photo_url}
            alt={previewMedia.name}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22180%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2216%22%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>

        <div className="border-t border-white/10 bg-black/60 px-4 py-3 text-white">
          <p className="text-sm text-white/90">{previewMedia.description?.trim() || 'No description provided.'}</p>
        </div>
      </div>
    </div>
  ) : null;

  if (isLoading) {
    if (isPortal) {
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
              <main className="relative min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
                <p className="py-12 text-center text-slate-500">{t('loading')}</p>
              </main>
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
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-blue-50">
        <Header />
        <main className="mx-auto min-h-0 max-w-7xl flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <p className="text-gray-500">{t('loading')}</p>
          </div>
        </main>
      </div>
    );
  }

  const inner = (
    <>
      {languageMenu}

      <button
        type="button"
        onClick={() => navigate(`/patients/${patientId}`)}
        className={`mb-6 flex items-center space-x-2 font-medium transition-colors ${accent} ${accentHover}`}
      >
        <ArrowLeft className="h-5 w-5" />
        <span>{t('back')}</span>
      </button>

      <div
        className={
          isPortal
            ? 'mb-6 rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-100'
            : 'mb-6 rounded-lg bg-white p-8 shadow-md'
        }
      >
        <h1 className={`mb-2 text-3xl font-bold ${textMain}`}>
          {toothInfo ? (
            <>
              <span className={accent}>{toothInfo.permanent ? t('permanent') : t('child')}</span> <span>{toothInfo.name}</span>
            </>
          ) : (
            `Tooth #${toothId}`
          )}
        </h1>
        <p className={muted}>{t('pastTreatments')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error === FETCH_ERROR_KEY ? t('fetchError') : error}
        </div>
      )}

      {treatmentsSection}
      {previewOverlay}
    </>
  );

  if (isPortal) {
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
            <main className="relative min-h-0 flex-1 overflow-y-auto bg-[#f9fafb] px-6 py-6">{inner}</main>
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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-blue-50">
      <Header />
      <main className="relative mx-auto min-h-0 max-w-7xl flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">{inner}</main>
    </div>
  );
};

export default ToothDetail;
