import { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { patientService } from '../services/api';
import type { Patient, PatientFilters, CreatePatientDto } from '../services/api';

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filters, setFilters] = useState<PatientFilters>({
    name: '',
    surname: '',
    birthdate: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState<CreatePatientDto>({
    name: '',
    surname: '',
    birthDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPatients = async (searchFilters?: PatientFilters) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await patientService.getAll(searchFilters);
      setPatients(data);
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
      setError(err.response?.data?.message || 'Failed to fetch patients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchFilters: PatientFilters = {};
    if (filters.name) searchFilters.name = filters.name;
    if (filters.surname) searchFilters.surname = filters.surname;
    if (filters.birthdate) searchFilters.birthdate = filters.birthdate;
    fetchPatients(searchFilters);
  };

  const handleClearSearch = () => {
    setFilters({ name: '', surname: '', birthdate: '' });
    fetchPatients();
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await patientService.create(newPatient);
      setShowAddModal(false);
      setNewPatient({ name: '', surname: '', birthDate: '' });
      fetchPatients();
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      setError(err.response?.data?.message || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit is handled in PatientDetail view; no row-level edit here.

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Patients</h1>
          
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Search by name"
                />
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="surname" className="block text-xs font-medium text-gray-700 mb-1">
                  Surname
                </label>
                <input
                  type="text"
                  id="surname"
                  value={filters.surname}
                  onChange={(e) => setFilters({ ...filters, surname: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Search by surname"
                />
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="birthdate" className="block text-xs font-medium text-gray-700 mb-1">
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birthdate"
                  value={filters.birthdate}
                  onChange={(e) => setFilters({ ...filters, birthdate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
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
            <table className="w-full table-fixed">
              <thead className="bg-teal-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider" style={{width: '33.33%'}}>
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider" style={{width: '33.33%'}}>
                    Surname
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider" style={{width: '33.33%'}}>
                    Birth Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Loading patients...
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No patients found
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="hover:bg-teal-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{patient.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{patient.surname}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{patient.birthDate}</td>
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
            <span>Add New Patient</span>
          </button>
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add New Patient</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="newName"
                  required
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label htmlFor="newSurname" className="block text-sm font-medium text-gray-700 mb-1">
                  Surname *
                </label>
                <input
                  type="text"
                  id="newSurname"
                  required
                  value={newPatient.surname}
                  onChange={(e) => setNewPatient({ ...newPatient, surname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter surname"
                />
              </div>

              <div>
                <label htmlFor="newBirthDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date *
                </label>
                <input
                  type="date"
                  id="newBirthDate"
                  required
                  value={newPatient.birthDate}
                  onChange={(e) => setNewPatient({ ...newPatient, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Patient'}
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

      {/* Row edit removed; editing is now done on Patient Detail page */}
    </div>
  );
};

export default Patients;

