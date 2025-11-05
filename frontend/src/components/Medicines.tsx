import { useState, useEffect } from 'react';
import { Search, Plus, X, Edit } from 'lucide-react';
import Header from './Header';
import { medicineService } from '../services/api';
import type { Medicine, MedicineFilters, CreateMedicineDto, UpdateMedicineDto } from '../services/api';

const Medicines = () => {
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
  });
  const [updatedMedicine, setUpdatedMedicine] = useState<UpdateMedicineDto>({
    name: '',
    description: '',
    price: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await medicineService.create(newMedicine);
      setShowAddModal(false);
      setNewMedicine({ name: '', description: '', price: 0 });
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

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Medicines</h1>
          
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[300px]">
                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                  Medicine Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Search by medicine name"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center space-x-1 px-4 py-2 bg-teal-500 text-white text-sm rounded-md font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
                
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md font-medium hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Loading medicines...
                    </td>
                  </tr>
                ) : medicines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No medicines found
                    </td>
                  </tr>
                ) : (
                  medicines.map((medicine) => (
                    <tr key={medicine.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{medicine.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{medicine.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${medicine.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleEditClick(medicine)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Medicine</span>
          </button>
        </div>
      </main>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add New Medicine</h2>
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
                  Name *
                </label>
                <input
                  type="text"
                  id="newName"
                  required
                  maxLength={40}
                  value={newMedicine.name}
                  onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter medicine name"
                />
              </div>

              <div>
                <label htmlFor="newDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="newDescription"
                  required
                  maxLength={300}
                  rows={3}
                  value={newMedicine.description}
                  onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  id="newPrice"
                  required
                  min="0"
                  step="0.01"
                  value={newMedicine.price || ''}
                  onChange={(e) => setNewMedicine({ ...newMedicine, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter price"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Medicine'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
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
              <h2 className="text-2xl font-bold text-gray-900">Edit Medicine</h2>
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
                  Name *
                </label>
                <input
                  type="text"
                  id="editName"
                  required
                  maxLength={40}
                  value={updatedMedicine.name}
                  onChange={(e) => setUpdatedMedicine({ ...updatedMedicine, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter medicine name"
                />
              </div>

              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="editDescription"
                  required
                  maxLength={300}
                  rows={3}
                  value={updatedMedicine.description}
                  onChange={(e) => setUpdatedMedicine({ ...updatedMedicine, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label htmlFor="editPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  id="editPrice"
                  required
                  min="0"
                  step="0.01"
                  value={updatedMedicine.price || ''}
                  onChange={(e) => setUpdatedMedicine({ ...updatedMedicine, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter price"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Medicine'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicines;

