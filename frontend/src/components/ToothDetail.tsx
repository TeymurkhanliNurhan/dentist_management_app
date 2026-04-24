import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign, Globe, X } from 'lucide-react';
import Header from './Header';
import { toothTreatmentService, toothService, mediaService } from '../services/api';
import type { ToothTreatment, ToothInfo, Media } from '../services/api';
import { useTranslation } from 'react-i18next';

const ToothDetail = () => {
  const { patientId, toothId } = useParams<{ patientId: string; toothId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('toothDetail');
  const [isLoading, setIsLoading] = useState(true);
  const [treatments, setTreatments] = useState<ToothTreatment[]>([]);
  const [toothInfo, setToothInfo] = useState<ToothInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [treatmentMedias, setTreatmentMedias] = useState<Map<number, Media[]>>(new Map());
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const FETCH_ERROR_KEY = '__tooth_fetch_error__';
  const languageMap: Record<string, string> = {
    en: 'english',
    az: 'azerbaijani',
    ru: 'russian',
  };

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
          toothTreatmentService.getAll({ tooth: parseInt(toothId), patient: parseInt(patientId) }),
          toothService.getAll({ id: parseInt(toothId), language: languageParam })
        ]);
        setTreatments(treatmentsData);
        if (toothData.length > 0) {
          setToothInfo(toothData[0]);
        }

        // Fetch media for each treatment
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
  }, [toothId, i18n.language]);

  if (isLoading) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-blue-50">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">{t('loading')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-blue-50">
      <Header />
      
      <main className="min-h-0 flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
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
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('back')}</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {toothInfo ? (
              <>
                <span className="text-teal-600">
                  {toothInfo.permanent ? t('permanent') : t('child')}
                </span>
                {' '}
                <span>{toothInfo.name}</span>
              </>
            ) : (
              `Tooth #${toothId}`
            )}
          </h1>
          <p className="text-gray-600">{t('pastTreatments')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error === FETCH_ERROR_KEY ? t('fetchError') : error}
          </div>
        )}

        {treatments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">{t('noTreatments')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {treatments.map((treatment) => (
              <div 
                key={treatment.id} 
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('appointmentDate')}</p>
                      <p className="text-lg text-gray-900 font-semibold">
                        {treatment.appointment.startDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('treatment')}</p>
                      <p className="text-lg text-gray-900 font-semibold">
                        {treatment.treatment.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <DollarSign className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('price')}</p>
                      <p className="text-lg text-gray-900 font-semibold">
                        ${treatment.treatment.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('treatmentDescription')}</p>
                      <p className="text-base text-gray-700">
                        {treatment.treatment.description || t('notAvailable')}
                      </p>
                    </div>
                  </div>
                </div>

                {treatment.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500 mb-1">{t('notes')}</p>
                    <p className="text-base text-gray-700">
                      {treatment.description}
                    </p>
                  </div>
                )}

                {(() => {
                  const medias = treatmentMedias.get(treatment.id) || [];
                  return medias.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-500 mb-3">{t('treatmentImages') || 'Treatment Images'}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {medias.map((media) => (
                          <div
                            key={media.id}
                            className="relative group rounded-md overflow-hidden border border-gray-300 cursor-zoom-in"
                            onClick={() => setPreviewMedia(media)}
                          >
                            <img
                              src={media.photo_url}
                              alt={media.name}
                              className="w-full h-32 object-cover bg-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                              <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">{t('view') || 'View'}</p>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 px-1 truncate" title={media.name}>
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
        )}

        {previewMedia && (
          <div
            className="fixed inset-0 bg-black/95 z-50"
            onClick={() => setPreviewMedia(null)}
          >
            <div
              className="w-full h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-black/60 text-white border-b border-white/10">
                <h3 className="text-sm sm:text-base font-semibold truncate pr-3">{previewMedia.name}</h3>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Close image preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-6">
                <img
                  src={previewMedia.photo_url}
                  alt={previewMedia.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22180%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22300%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2216%22%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>

              <div className="px-4 py-3 bg-black/60 text-white border-t border-white/10">
                <p className="text-sm text-white/90">
                  {previewMedia.description?.trim() || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ToothDetail;

