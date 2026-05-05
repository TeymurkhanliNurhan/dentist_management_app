import { useMemo, useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Eye, UserPlus, UserMinus } from 'lucide-react';
import ClinicManagementLayout from './ClinicManagementLayout';
import { treatmentService, dentistService, dentistTreatmentService } from '../services/api';
import type {
  Treatment,
  TreatmentFilters,
  CreateTreatmentDto,
  UpdateTreatmentDto,
  TreatmentPricePer,
  DentistProfile,
} from '../services/api';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Treatments = () => {
  const { t } = useTranslation('treatments');
  const navigate = useNavigate();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const isDentistUser = role === 'dentist';
  const dentistId = useMemo(() => Number(localStorage.getItem('dentistId') ?? 0), []);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [assignedTreatmentIds, setAssignedTreatmentIds] = useState<number[]>([]);
  const [showRestTreatments, setShowRestTreatments] = useState(false);
  const [filters, setFilters] = useState<TreatmentFilters>({
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [newTreatment, setNewTreatment] = useState<CreateTreatmentDto>({
    name: '',
    description: '',
    price: 0,
    pricePer: null,
  });
  const [updatedTreatment, setUpdatedTreatment] = useState<UpdateTreatmentDto>({
    name: '',
    description: '',
    price: 0,
    pricePer: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDentistsModal, setShowDentistsModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [dentists, setDentists] = useState<DentistProfile[]>([]);
  const [assignedDentistIds, setAssignedDentistIds] = useState<number[]>([]);
  const [selectedDentistIdToAdd, setSelectedDentistIdToAdd] = useState(0);
  const [isUpdatingDentists, setIsUpdatingDentists] = useState(false);
  const [isUpdatingDentistTreatments, setIsUpdatingDentistTreatments] = useState(false);

  const fetchTreatments = async (searchFilters?: TreatmentFilters) => {
    setIsLoading(true);
    setError('');
    try {
      const [data, links] = await Promise.all([
        treatmentService.getAll(searchFilters),
        isDentistUser && Number.isFinite(dentistId) && dentistId > 0
          ? dentistTreatmentService.getAll({ dentist: dentistId })
          : Promise.resolve([]),
      ]);
      setTreatments(data);
      setAssignedTreatmentIds(links.map((link) => link.treatment));
    } catch (err: any) {
      console.error('Failed to fetch treatments:', err);
      setError(err.response?.data?.message || 'Failed to fetch treatments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  useEffect(() => {
    if (!isDentistUser) {
      setShowRestTreatments(false);
    }
  }, [isDentistUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchFilters: TreatmentFilters = {};
    if (filters.name) searchFilters.name = filters.name;
    fetchTreatments(searchFilters);
  };

  const handleClearSearch = () => {
    setFilters({ name: '' });
    fetchTreatments();
  };

  const pricePerLabel = (p: Treatment['pricePer']) => {
    if (p === 'tooth') return t('form.pricePerTooth');
    if (p === 'chin') return t('form.pricePerChin');
    if (p === 'mouth') return t('form.pricePerMouth');
    return t('form.pricePerUnset');
  };

  const availableDentistsToAdd = useMemo(
    () => dentists.filter((dentist) => !assignedDentistIds.includes(dentist.id)),
    [dentists, assignedDentistIds],
  );

  const visibleTreatments = useMemo(() => {
    if (!isDentistUser) {
      return treatments;
    }
    return treatments.filter((treatment) =>
      showRestTreatments
        ? !assignedTreatmentIds.includes(treatment.id)
        : assignedTreatmentIds.includes(treatment.id),
    );
  }, [assignedTreatmentIds, isDentistUser, showRestTreatments, treatments]);

  const openDentistsModal = async (treatment: Treatment) => {
    setError('');
    setSelectedTreatment(treatment);
    setShowDentistsModal(true);
    try {
      const [allDentists, links] = await Promise.all([
        dentistService.getAll(),
        dentistTreatmentService.getAll({ treatment: treatment.id }),
      ]);
      setDentists(allDentists);
      setAssignedDentistIds(links.map((link) => link.dentist));
      setSelectedDentistIdToAdd(0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dentists');
    }
  };

  const handleAddDentistToTreatment = async () => {
    if (!selectedTreatment || !selectedDentistIdToAdd) return;
    setIsUpdatingDentists(true);
    try {
      await dentistTreatmentService.create(
        selectedTreatment.id,
        selectedDentistIdToAdd,
      );
      setAssignedDentistIds((prev) => [...prev, selectedDentistIdToAdd]);
      setSelectedDentistIdToAdd(0);
      await fetchTreatments(filters.name ? { name: filters.name } : undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add dentist');
    } finally {
      setIsUpdatingDentists(false);
    }
  };

  const handleRemoveDentistFromTreatment = async (dentistId: number) => {
    if (!selectedTreatment) return;
    setIsUpdatingDentists(true);
    try {
      await dentistTreatmentService.remove(selectedTreatment.id, dentistId);
      setAssignedDentistIds((prev) => prev.filter((id) => id !== dentistId));
      await fetchTreatments(filters.name ? { name: filters.name } : undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove dentist');
    } finally {
      setIsUpdatingDentists(false);
    }
  };

  const refreshTreatmentsWithCurrentFilters = async () => {
    await fetchTreatments(filters.name ? { name: filters.name } : undefined);
  };

  const handleAddTreatmentForCurrentDentist = async (treatmentId: number) => {
    if (!isDentistUser || !dentistId) return;
    setIsUpdatingDentistTreatments(true);
    setError('');
    try {
      await dentistTreatmentService.create(treatmentId, dentistId);
      await refreshTreatmentsWithCurrentFilters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add treatment');
    } finally {
      setIsUpdatingDentistTreatments(false);
    }
  };

  const handleRemoveTreatmentForCurrentDentist = async (treatmentId: number) => {
    if (!isDentistUser || !dentistId) return;
    setIsUpdatingDentistTreatments(true);
    setError('');
    try {
      await dentistTreatmentService.remove(treatmentId, dentistId);
      await refreshTreatmentsWithCurrentFilters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove treatment');
    } finally {
      setIsUpdatingDentistTreatments(false);
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await treatmentService.create(newTreatment);
      setShowAddModal(false);
      setNewTreatment({ name: '', description: '', price: 0, pricePer: null });
      fetchTreatments();
    } catch (err: any) {
      console.error('Failed to create treatment:', err);
      setError(err.response?.data?.message || 'Failed to create treatment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setUpdatedTreatment({
      name: treatment.name,
      description: treatment.description,
      price: treatment.price,
      pricePer: treatment.pricePer ?? null,
    });
    setShowEditModal(true);
  };

  const handleUpdateTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreatment) return;
    
    setIsSubmitting(true);
    setError('');
    try {
      await treatmentService.update(editingTreatment.id, updatedTreatment);
      setShowEditModal(false);
      setEditingTreatment(null);
      setUpdatedTreatment({ name: '', description: '', price: 0, pricePer: null });
      fetchTreatments();
    } catch (err: any) {
      console.error('Failed to update treatment:', err);
      setError(err.response?.data?.message || 'Failed to update treatment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ClinicManagementLayout>
      <main className="mx-auto w-full max-w-[1400px] py-2">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('searchPlaceholder')}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isDentistUser && (
              <button
                type="button"
                className="rounded-md bg-[#0066A6] px-4 py-2 text-sm font-semibold text-white"
              >
                Treatments
              </button>
            )}
            {!isDentistUser && (
              <button
                type="button"
                onClick={() => navigate('/medicines')}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Medicines
              </button>
            )}
            {isDentistUser && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRestTreatments(false)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    !showRestTreatments
                      ? 'bg-[#0066A6] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  My Treatments
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestTreatments(true)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    showRestTreatments
                      ? 'bg-[#0066A6] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Rest Treatments
                </button>
              </>
            )}
            {!isDentistUser && (
              <button
                onClick={() => setShowAddModal(true)}
                className="ml-2 flex items-center space-x-2 rounded-md bg-[#0066A6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00588f]"
              >
                <Plus className="h-4 w-4" />
                <span>{t('addNew')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <form onSubmit={handleSearch}>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[280px]">
                <label htmlFor="name" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('searchLabel')}
                </label>
                <input
                  type="text"
                  id="name"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#0066A6] focus:outline-none"
                  placeholder={t('searchPlaceholder')}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-1 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00588f] disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  <span>{t('search')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  {t('clear')}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('table.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('table.description')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('table.price')}
                  </th>
                  {!isDentistUser && (
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                      {t('table.dentists')}
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={isDentistUser ? 4 : 5} className="px-6 py-8 text-center text-sm text-slate-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : visibleTreatments.length === 0 ? (
                  <tr>
                    <td colSpan={isDentistUser ? 4 : 5} className="px-6 py-8 text-center text-sm text-slate-500">
                      {t('empty')}
                    </td>
                  </tr>
                ) : (
                  visibleTreatments.map((treatment) => (
                    <tr key={treatment.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-semibold text-[#0066A6]">{treatment.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{treatment.description}</td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-medium text-slate-900">{treatment.price.toFixed(2)} USD</p>
                        <p className="text-xs text-slate-500">{pricePerLabel(treatment.pricePer)}</p>
                      </td>
                      {!isDentistUser && (
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="flex items-center gap-3">
                            <span>{treatment.dentistCount}</span>
                            <button
                              type="button"
                              onClick={() => openDentistsModal(treatment)}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50"
                              aria-label="Manage dentists"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm">
                        {isDentistUser ? (
                          showRestTreatments ? (
                            <button
                              type="button"
                              disabled={isUpdatingDentistTreatments}
                              onClick={() => handleAddTreatmentForCurrentDentist(treatment.id)}
                              className="flex items-center gap-1 rounded-md border border-green-200 px-3 py-1.5 text-sm text-green-700 transition hover:bg-green-50 disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isUpdatingDentistTreatments}
                              onClick={() => handleRemoveTreatmentForCurrentDentist(treatment.id)}
                              className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <UserMinus className="h-4 w-4" />
                              Remove
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleEditClick(treatment)}
                            className="flex items-center space-x-1 rounded-md bg-[#0066A6] px-3 py-1.5 text-white transition hover:bg-[#00588f]"
                          >
                            <Edit className="w-4 h-4" />
                            <span>{t('edit')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      </ClinicManagementLayout>

      {/* Add Treatment Modal */}
      {!isDentistUser && showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('addTitle')}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddTreatment} className="space-y-4">
              <div>
                <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  id="newName"
                  required
                  maxLength={40}
                  value={newTreatment.name}
                  onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="newDescription" className="block textsm font-medium text-gray-700 mb-1">
                  {t('form.description')}
                </label>
                <textarea
                  id="newDescription"
                  required
                  maxLength={300}
                  rows={3}
                  value={newTreatment.description}
                  onChange={(e) => setNewTreatment({ ...newTreatment, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.price')}
                </label>
                <input
                  type="number"
                  id="newPrice"
                  required
                  min="0"
                  step="0.01"
                  value={newTreatment.price || ''}
                  onChange={(e) => setNewTreatment({ ...newTreatment, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.pricePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="newPricePer" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.pricePer')}
                </label>
                <select
                  id="newPricePer"
                  value={newTreatment.pricePer ?? ''}
                  onChange={(e) =>
                    setNewTreatment({
                      ...newTreatment,
                      pricePer: e.target.value === '' ? null : (e.target.value as TreatmentPricePer),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                >
                  <option value="">{t('form.pricePerUnset')}</option>
                  <option value="tooth">{t('form.pricePerTooth')}</option>
                  <option value="chin">{t('form.pricePerChin')}</option>
                  <option value="mouth">{t('form.pricePerMouth')}</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">{t('form.pricePerPlaceholder')}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-[#0066A6] text-white rounded-lg font-medium hover:bg-[#00588f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('adding') : t('add')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Treatment Modal */}
      {!isDentistUser && showEditModal && editingTreatment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('editTitle')}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateTreatment} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  id="editName"
                  required
                  maxLength={40}
                  value={updatedTreatment.name}
                  onChange={(e) => setUpdatedTreatment({ ...updatedTreatment, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.description')}
                </label>
                <textarea
                  id="editDescription"
                  required
                  maxLength={300}
                  rows={3}
                  value={updatedTreatment.description}
                  onChange={(e) => setUpdatedTreatment({ ...updatedTreatment, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="editPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.price')}
                </label>
                <input
                  type="number"
                  id="editPrice"
                  required
                  min="0"
                  step="0.01"
                  value={updatedTreatment.price || ''}
                  onChange={(e) => setUpdatedTreatment({ ...updatedTreatment, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.pricePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="editPricePer" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.pricePer')}
                </label>
                <select
                  id="editPricePer"
                  value={updatedTreatment.pricePer ?? ''}
                  onChange={(e) =>
                    setUpdatedTreatment({
                      ...updatedTreatment,
                      pricePer: e.target.value === '' ? null : (e.target.value as TreatmentPricePer),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                >
                  <option value="">{t('form.pricePerUnset')}</option>
                  <option value="tooth">{t('form.pricePerTooth')}</option>
                  <option value="chin">{t('form.pricePerChin')}</option>
                  <option value="mouth">{t('form.pricePerMouth')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-[#0066A6] text-white rounded-lg font-medium hover:bg-[#00588f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('updating') : t('update')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {!isDentistUser && showDentistsModal && selectedTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedTreatment.name}</h2>
                <p className="text-sm text-gray-500">Manage assigned dentists</p>
              </div>
              <button
                onClick={() => setShowDentistsModal(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <label htmlFor="dentist-to-add" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Add dentist
                  </label>
                  <select
                    id="dentist-to-add"
                    value={selectedDentistIdToAdd}
                    onChange={(e) => setSelectedDentistIdToAdd(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-[#0066A6] focus:outline-none"
                  >
                    <option value={0}>Select dentist</option>
                    {availableDentistsToAdd.map((dentist) => (
                      <option key={dentist.id} value={dentist.id}>
                        Dr. {dentist.staff?.name} {dentist.staff?.surname}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!selectedDentistIdToAdd || isUpdatingDentists}
                  onClick={handleAddDentistToTreatment}
                  className="flex items-center gap-1 rounded-md bg-[#0066A6] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00588f] disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
            <div className="max-h-[340px] overflow-auto rounded-lg border border-slate-100">
              {assignedDentistIds.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No dentists assigned yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {assignedDentistIds.map((dentistId) => {
                    const dentist = dentists.find((d) => d.id === dentistId);
                    return (
                      <li key={dentistId} className="flex items-center justify-between p-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            Dr. {dentist?.staff?.name ?? 'Unknown'} {dentist?.staff?.surname ?? ''}
                          </p>
                          <p className="text-xs text-slate-500">Dentist ID: {dentistId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDentistFromTreatment(dentistId)}
                          disabled={isUpdatingDentists}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <UserMinus className="h-4 w-4" />
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Treatments;

