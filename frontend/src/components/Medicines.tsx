import { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClinicManagementLayout from './ClinicManagementLayout';
import { medicineService, purchaseMedicineService } from '../services/api';
import type {
  Medicine,
  MedicineFilters,
  CreateMedicineDto,
  UpdateMedicineDto,
  CreatePurchaseSessionItemDto,
} from '../services/api';
import { useTranslation } from 'react-i18next';

const Medicines = () => {
  const { t } = useTranslation('medicines');
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filters, setFilters] = useState<MedicineFilters>({
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [newMedicine, setNewMedicine] = useState<CreateMedicineDto>({
    name: '',
    description: '',
    price: 0,
    purchasePrice: 0,
  });
  const [updatedMedicine, setUpdatedMedicine] = useState<UpdateMedicineDto>({
    name: '',
    description: '',
    price: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<CreatePurchaseSessionItemDto[]>(
    [],
  );
  const [editingStockMedicineId, setEditingStockMedicineId] = useState<number | null>(
    null,
  );
  const [draftStock, setDraftStock] = useState(0);
  const [showQuickMedicineModal, setShowQuickMedicineModal] = useState(false);
  const [quickMedicine, setQuickMedicine] = useState({
    name: '',
    description: '',
    price: 0,
    purchasePrice: 0,
  });

  const fetchMedicines = async (searchFilters?: MedicineFilters) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await medicineService.getAll(searchFilters);
      setMedicines(data);
    } catch (err: any) {
      console.error('Failed to fetch medicines:', err);
      setError(err.response?.data?.message || 'Failed to fetch medicines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchFilters: MedicineFilters = {};
    if (filters.name) searchFilters.name = filters.name;
    fetchMedicines(searchFilters);
  };

  const handleClearSearch = () => {
    setFilters({ name: '' });
    fetchMedicines();
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await medicineService.create({
        name: newMedicine.name.trim(),
        description: (newMedicine.description ?? '').trim() || undefined,
        price: newMedicine.price,
        purchasePrice: newMedicine.purchasePrice ?? 0,
        stock: 2,
      });
      setShowAddModal(false);
      setNewMedicine({ name: '', description: '', price: 0, purchasePrice: 0 });
      fetchMedicines();
    } catch (err: any) {
      console.error('Failed to create medicine:', err);
      setError(err.response?.data?.message || 'Failed to create medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setUpdatedMedicine({
      name: medicine.name,
      description: medicine.description,
      price: medicine.price,
      purchasePrice: medicine.purchasePrice,
    });
    setShowEditModal(true);
  };

  const handleUpdateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;
    
    setIsSubmitting(true);
    setError('');
    try {
      await medicineService.update(editingMedicine.id, updatedMedicine);
      setShowEditModal(false);
      setEditingMedicine(null);
      setUpdatedMedicine({ name: '', description: '', price: 0 });
      fetchMedicines();
    } catch (err: any) {
      console.error('Failed to update medicine:', err);
      setError(err.response?.data?.message || 'Failed to update medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStock = async (medicine: Medicine, stock: number) => {
    if (stock < 0) return;
    setError('');
    try {
      await medicineService.update(medicine.id, { stock });
      await fetchMedicines(filters);
    } catch (err: any) {
      console.error('Failed to update stock:', err);
      setError(err.response?.data?.message || 'Failed to update stock');
    }
  };

  const startStockEditing = (medicine: Medicine) => {
    setEditingStockMedicineId(medicine.id);
    setDraftStock(medicine.stock ?? 0);
  };

  const cancelStockEditing = () => {
    setEditingStockMedicineId(null);
    setDraftStock(0);
  };

  const saveStockEditing = async (medicine: Medicine) => {
    await updateStock(medicine, draftStock);
    setEditingStockMedicineId(null);
    setDraftStock(0);
  };

  const openPurchaseModal = () => {
    const firstMedicine = medicines[0];
    setPurchaseItems([
      {
        medicineId: firstMedicine?.id ?? 0,
        count: 1,
        pricePerOne: firstMedicine?.purchasePrice ?? 0,
      },
    ]);
    setShowQuickMedicineModal(false);
    setShowPurchaseModal(true);
  };

  const resetQuickMedicineForm = () => {
    setQuickMedicine({ name: '', description: '', price: 0, purchasePrice: 0 });
  };

  const handleQuickCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickMedicine.name.trim();
    if (!name) {
      setError(t('purchase.nameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const created = await medicineService.create({
        name,
        description: quickMedicine.description.trim() || undefined,
        price: quickMedicine.price,
        purchasePrice: quickMedicine.purchasePrice,
        stock: 0,
      });
      await fetchMedicines(filters);
      setPurchaseItems((prev) => [
        ...prev,
        {
          medicineId: created.id,
          count: 1,
          pricePerOne: created.purchasePrice ?? quickMedicine.purchasePrice,
        },
      ]);
      setShowQuickMedicineModal(false);
      resetQuickMedicineForm();
    } catch (err: any) {
      console.error('Failed to create medicine:', err);
      setError(err.response?.data?.message || 'Failed to create medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseItemChange = (
    index: number,
    patch: Partial<CreatePurchaseSessionItemDto>,
  ) => {
    setPurchaseItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, ...patch };
        if (patch.medicineId !== undefined) {
          const selected = medicines.find((m) => m.id === patch.medicineId);
          if (selected) updated.pricePerOne = selected.purchasePrice ?? 0;
        }
        return updated;
      }),
    );
  };

  const addPurchaseRow = () => {
    const selectedMedicineIds = new Set(purchaseItems.map((item) => item.medicineId));
    const fallback = medicines.find((medicine) => !selectedMedicineIds.has(medicine.id));
    if (!fallback) return;
    setPurchaseItems((prev) => [
      ...prev,
      {
        medicineId: fallback?.id ?? 0,
        count: 1,
        pricePerOne: fallback?.purchasePrice ?? 0,
      },
    ]);
  };

  const removePurchaseRow = (index: number) => {
    setPurchaseItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = purchaseItems.filter(
      (item) =>
        Number.isFinite(item.medicineId) &&
        item.medicineId > 0 &&
        Number.isFinite(item.count) &&
        item.count > 0,
    );

    if (validItems.length === 0) {
      setError('Please select medicine and count');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await purchaseMedicineService.createSession({ items: validItems });
      setShowPurchaseModal(false);
      await fetchMedicines(filters);
    } catch (err: any) {
      console.error('Failed to create purchase:', err);
      setError(err.response?.data?.message || 'Failed to create purchase');
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
            <button
              type="button"
              onClick={() => navigate('/treatments')}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Treatments
            </button>
            <button
              type="button"
              className="rounded-md bg-[#0066A6] px-4 py-2 text-sm font-semibold text-white"
            >
              Medicines
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="ml-2 flex items-center space-x-2 rounded-md bg-[#0066A6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00588f]"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addNew')}</span>
            </button>
            <button
              type="button"
              onClick={openPurchaseModal}
              className="ml-2 flex items-center space-x-2 rounded-md border border-[#0066A6] bg-white px-5 py-2.5 text-sm font-semibold text-[#0066A6] transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              <span>{t('newPurchase')}</span>
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3">
          <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t('stats.medicinesCount')}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{medicines.length}</p>
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
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">
                    {t('table.name')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">
                    {t('table.description')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">
                    {t('table.price')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">
                    {t('table.purchasePrice')}
                  </th>
                  <th className="w-32 min-w-[8rem] px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">
                    {t('table.stock')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-slate-500"
                    >
                      {t('loading')}
                    </td>
                  </tr>
                ) : medicines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-slate-500"
                    >
                      {t('empty')}
                    </td>
                  </tr>
                ) : (
                  medicines.map((medicine) => (
                    <tr key={medicine.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-center text-sm font-semibold text-[#0066A6]">
                        {medicine.name}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {medicine.description}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-900">
                        {medicine.price.toFixed(2)} USD
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-900">
                        {(medicine.purchasePrice ?? 0).toFixed(2)} USD
                      </td>
                      <td className="w-32 min-w-[8rem] px-6 py-4 text-center text-sm align-middle">
                        {editingStockMedicineId === medicine.id ? (
                          <div className="mx-auto flex w-min min-w-[6.5rem] flex-col items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1">
                              <button
                                type="button"
                                onClick={() => setDraftStock((prev) => Math.max(0, prev - 1))}
                                className="rounded border border-slate-200 bg-white p-1 text-slate-700 transition hover:bg-slate-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-8 text-center font-semibold text-slate-900">
                                {draftStock}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDraftStock((prev) => prev + 1)}
                                className="rounded border border-slate-200 bg-white p-1 text-slate-700 transition hover:bg-slate-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex w-full justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveStockEditing(medicine)}
                                className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelStockEditing}
                                className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mx-auto flex w-min min-w-[6.5rem] justify-center">
                            <button
                              type="button"
                              onClick={() => startStockEditing(medicine)}
                              className="rounded border border-slate-200 px-3 py-1 font-semibold text-slate-900 transition hover:bg-slate-50"
                            >
                              {medicine.stock ?? 0}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <button
                          onClick={() => handleEditClick(medicine)}
                          className="inline-flex items-center justify-center space-x-1 rounded-md bg-[#0066A6] px-3 py-1.5 text-white transition hover:bg-[#00588f]"
                        >
                          <Edit className="w-4 h-4" />
                          <span>{t('edit')}</span>
                        </button>
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

      {/* Add Medicine Modal */}
      {showAddModal && (
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

            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div>
                <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  id="newName"
                  required
                  maxLength={40}
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="newDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.descriptionOptional')}
                </label>
                <textarea
                  id="newDescription"
                  maxLength={300}
                  rows={2}
                  value={newMedicine.description}
                  onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
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
                  value={newMedicine.price ?? ''}
                  onChange={(e) => setNewMedicine({ ...newMedicine, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.pricePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="newPurchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.purchasePrice')}
                </label>
                <input
                  type="number"
                  id="newPurchasePrice"
                  required
                  min="0"
                  step="0.01"
                  value={newMedicine.purchasePrice ?? ''}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      purchasePrice:
                        e.target.value === '' ? 0 : parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.purchasePricePlaceholder')}
                />
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

      {/* Edit Medicine Modal */}
      {showEditModal && editingMedicine && (
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

            <form onSubmit={handleUpdateMedicine} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  id="editName"
                  required
                  maxLength={40}
                  value={updatedMedicine.name}
                  onChange={(e) => setUpdatedMedicine({ ...updatedMedicine, name: e.target.value })}
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
                  value={updatedMedicine.description}
                  onChange={(e) => setUpdatedMedicine({ ...updatedMedicine, description: e.target.value })}
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
                  value={updatedMedicine.price ?? ''}
                  onChange={(e) => setUpdatedMedicine({ ...updatedMedicine, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.pricePlaceholder')}
                />
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

      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('purchase.title')}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowQuickMedicineModal(false);
                  setShowPurchaseModal(false);
                }}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              {purchaseItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t('purchase.medicine')}
                    </label>
                    <select
                      value={item.medicineId || ''}
                      onChange={(e) =>
                        handlePurchaseItemChange(index, {
                          medicineId: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                      required
                    >
                      <option value="">{t('purchase.chooseMedicine')}</option>
                      {medicines
                        .filter((medicine) => {
                          const selectedByOtherRow = purchaseItems.some(
                            (selectedItem, selectedIndex) =>
                              selectedIndex !== index &&
                              selectedItem.medicineId === medicine.id,
                          );
                          return !selectedByOtherRow;
                        })
                        .map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name}
                        </option>
                        ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t('purchase.count')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.count}
                      onChange={(e) =>
                        handlePurchaseItemChange(index, {
                          count:
                            e.target.value === ''
                              ? 1
                              : Math.max(1, parseInt(e.target.value, 10)),
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {t('purchase.pricePerOne')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.pricePerOne}
                      onChange={(e) =>
                        handlePurchaseItemChange(index, {
                          pricePerOne:
                            e.target.value === ''
                              ? 0
                              : Math.max(0, parseFloat(e.target.value)),
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                      required
                    />
                  </div>
                  <div className="flex items-end md:col-span-1">
                    <button
                      type="button"
                      onClick={() => removePurchaseRow(index)}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addPurchaseRow}
                    disabled={
                      purchaseItems.length >= medicines.length ||
                      medicines.length === 0
                    }
                    className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('purchase.addMedicineRow')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetQuickMedicineForm();
                      setShowQuickMedicineModal(true);
                    }}
                    className="rounded-md border border-[#0066A6] bg-white px-4 py-2 text-sm font-semibold text-[#0066A6] transition hover:bg-slate-50"
                  >
                    {t('purchase.newMedicine')}
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {t('purchase.total')}{' '}
                  {purchaseItems
                    .reduce((sum, item) => sum + item.count * item.pricePerOne, 0)
                    .toFixed(2)}{' '}
                  USD
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-[#0066A6] py-2 font-medium text-white transition-colors hover:bg-[#00588f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t('purchase.creating') : t('purchase.create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMedicineModal(false);
                    setShowPurchaseModal(false);
                  }}
                  className="flex-1 rounded-lg bg-gray-200 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && showQuickMedicineModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t('purchase.quickNewTitle')}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowQuickMedicineModal(false);
                  resetQuickMedicineForm();
                }}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateMedicine} className="space-y-4">
              <div>
                <label htmlFor="quickName" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('form.name')}
                </label>
                <input
                  id="quickName"
                  type="text"
                  required
                  maxLength={40}
                  value={quickMedicine.name}
                  onChange={(e) => setQuickMedicine({ ...quickMedicine, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.namePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="quickDescription" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('form.descriptionOptional')}
                </label>
                <textarea
                  id="quickDescription"
                  maxLength={300}
                  rows={2}
                  value={quickMedicine.description}
                  onChange={(e) =>
                    setQuickMedicine({ ...quickMedicine, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.descriptionPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="quickPrice" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('form.price')}
                </label>
                <input
                  id="quickPrice"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={quickMedicine.price ?? ''}
                  onChange={(e) =>
                    setQuickMedicine({
                      ...quickMedicine,
                      price: e.target.value === '' ? 0 : parseFloat(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.pricePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="quickPurchasePrice" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('form.purchasePrice')}
                </label>
                <input
                  id="quickPurchasePrice"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={quickMedicine.purchasePrice ?? ''}
                  onChange={(e) =>
                    setQuickMedicine({
                      ...quickMedicine,
                      purchasePrice:
                        e.target.value === '' ? 0 : parseFloat(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066A6]"
                  placeholder={t('form.purchasePricePlaceholder')}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-[#0066A6] py-2 font-medium text-white transition-colors hover:bg-[#00588f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t('adding') : t('purchase.quickCreateSubmit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMedicineModal(false);
                    resetQuickMedicineForm();
                  }}
                  className="flex-1 rounded-lg bg-gray-200 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Medicines;

