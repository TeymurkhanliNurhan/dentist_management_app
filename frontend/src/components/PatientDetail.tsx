import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Edit, X, Globe } from 'lucide-react';
import Header from './Header';
import TeethDiagram from './TeethDiagram';
import { patientService } from '../services/api';
import type { Patient, PatientTooth } from '../services/api';
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
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const FETCH_ERROR_KEY = '__fetch_error__';
  const UPDATE_ERROR_KEY = '__update_error__';

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
          patientService.getPatientTeeth(parseInt(id))
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('teethDiagram')}</h2>
          <TeethDiagram patientId={patient.id} patientTeeth={patientTeeth} />
        </div>

        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Edit Patient</h2>
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
                {formError === UPDATE_ERROR_KEY ? t('updateError') : formError}
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
                    disabled={isSubmitting}
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
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDetail;

