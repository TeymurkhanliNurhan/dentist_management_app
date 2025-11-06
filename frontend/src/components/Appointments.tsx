import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import Header from './Header';
import { appointmentService, patientService } from '../services/api';
import type { Appointment, AppointmentFilters, CreateAppointmentDto, Patient } from '../services/api';

const Appointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filters, setFilters] = useState<AppointmentFilters>({
    startDate: '',
    patientName: '',
    patientSurname: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState<CreateAppointmentDto>({
    startDate: '',
    endDate: '',
    discountFee: 0,
    patient_id: 0,
  });
  const [patientSearch, setPatientSearch] = useState({ name: '', surname: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAppointments = async (searchFilters?: AppointmentFilters) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await appointmentService.getAll(searchFilters);
      setAppointments(data);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const fetchPatients = async () => {
      try {
        const data = await patientService.getAll();
        setPatients(data);
      } catch (err: any) {
        console.error('Failed to fetch patients:', err);
      }
    };
    fetchPatients();
  }, []);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await appointmentService.create(newAppointment);
      setShowAddModal(false);
      setNewAppointment({ startDate: '', endDate: '', discountFee: 0, patient_id: 0 });
      setPatientSearch({ name: '', surname: '' });
      fetchAppointments();
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setError(err.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchFilters: AppointmentFilters = {};
    if (filters.startDate) searchFilters.startDate = filters.startDate;
    if (filters.patientName) searchFilters.patientName = filters.patientName;
    if (filters.patientSurname) searchFilters.patientSurname = filters.patientSurname;
    fetchAppointments(searchFilters);
  };

  const handleClearSearch = () => {
    setFilters({ startDate: '', patientName: '', patientSurname: '' });
    fetchAppointments();
  };

  const filteredPatients = patients.filter((patient) => {
    const nameMatch = patientSearch.name === '' || 
      patient.name.toLowerCase().includes(patientSearch.name.toLowerCase());
    const surnameMatch = patientSearch.surname === '' || 
      patient.surname.toLowerCase().includes(patientSearch.surname.toLowerCase());
    return nameMatch && surnameMatch;
  });

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Appointments</h1>
          
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="startDate" className="block text-xs font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="patientName" className="block text-xs font-medium text-gray-700 mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  id="patientName"
                  value={filters.patientName}
                  onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Search by patient name"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label htmlFor="patientSurname" className="block text-xs font-medium text-gray-700 mb-1">
                  Patient Surname
                </label>
                <input
                  type="text"
                  id="patientSurname"
                  value={filters.patientSurname}
                  onChange={(e) => setFilters({ ...filters, patientSurname: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Search by patient surname"
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
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                    Patient Surname
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Loading appointments...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr 
                      key={appointment.id} 
                      onClick={() => navigate(`/appointments/${appointment.id}`)}
                      className="hover:bg-teal-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {appointment.startDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {appointment.patient.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {appointment.patient.surname}
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
            <span>New Appointment</span>
          </button>
        </div>

        {/* Add Appointment Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">New Appointment</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setPatientSearch({ name: '', surname: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient *
                  </label>
                  
                  <div className="space-y-2 mb-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label htmlFor="patientNameSearch" className="block text-xs font-medium text-gray-600 mb-1">
                          Search by Name
                        </label>
                        <input
                          type="text"
                          id="patientNameSearch"
                          value={patientSearch.name}
                          onChange={(e) => setPatientSearch({ ...patientSearch, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder="Patient name"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="patientSurnameSearch" className="block text-xs font-medium text-gray-600 mb-1">
                          Search by Surname
                        </label>
                        <input
                          type="text"
                          id="patientSurnameSearch"
                          value={patientSearch.surname}
                          onChange={(e) => setPatientSearch({ ...patientSearch, surname: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                          placeholder="Patient surname"
                        />
                      </div>
                    </div>
                  </div>

                  <select
                    id="patient"
                    required
                    value={newAppointment.patient_id}
                    onChange={(e) => setNewAppointment({ ...newAppointment, patient_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={0}>Select a patient</option>
                    {filteredPatients.length === 0 ? (
                      <option disabled>No patients found</option>
                    ) : (
                      filteredPatients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name} {patient.surname}
                        </option>
                      ))
                    )}
                  </select>
                  {filteredPatients.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {filteredPatients.length} patient(s) found
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="newStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="newStartDate"
                    required
                    value={newAppointment.startDate}
                    onChange={(e) => setNewAppointment({ ...newAppointment, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="newEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="newEndDate"
                    value={newAppointment.endDate}
                    onChange={(e) => setNewAppointment({ ...newAppointment, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="newDiscountFee" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Fee
                  </label>
                  <input
                    type="number"
                    id="newDiscountFee"
                    min="0"
                    step="0.01"
                    value={newAppointment.discountFee || ''}
                    onChange={(e) => setNewAppointment({ ...newAppointment, discountFee: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter discount fee"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Appointment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setPatientSearch({ name: '', surname: '' });
                    }}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
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

export default Appointments;

