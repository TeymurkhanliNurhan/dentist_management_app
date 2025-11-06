import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, FileText, Edit, X, Pill, DollarSign, Plus } from 'lucide-react';
import Header from './Header';
import { appointmentService, toothTreatmentService, toothService, toothTreatmentMedicineService, treatmentService, patientService } from '../services/api';
import type { Appointment, ToothTreatment, ToothInfo, ToothTreatmentMedicine, Treatment, PatientTooth, CreateToothTreatmentDto } from '../services/api';

const AppointmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [treatments, setTreatments] = useState<ToothTreatment[]>([]);
  const [teethInfo, setTeethInfo] = useState<Map<number, ToothInfo>>(new Map());
  const [treatmentMedicines, setTreatmentMedicines] = useState<Map<number, ToothTreatmentMedicine[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditAppointment, setShowEditAppointment] = useState(false);
  const [editedAppointment, setEditedAppointment] = useState({
    startDate: '',
    endDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [availableTreatments, setAvailableTreatments] = useState<Treatment[]>([]);
  const [patientTeeth, setPatientTeeth] = useState<PatientTooth[]>([]);
  const [newTreatment, setNewTreatment] = useState<CreateToothTreatmentDto>({
    appointment_id: 0,
    treatment_id: 0,
    patient_id: 0,
    tooth_id: 0,
    description: '',
  });
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);

  useEffect(() => {
    const fetchAppointmentData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError('');
      try {
        const [appointmentsData, treatmentsData] = await Promise.all([
          appointmentService.getAll(),
          toothTreatmentService.getAll({ appointment: parseInt(id) })
        ]);
        
        const appointmentData = appointmentsData.find(a => a.id === parseInt(id));
        if (!appointmentData) {
          setError('Appointment not found');
        } else {
          setAppointment(appointmentData);
          setEditedAppointment({
            startDate: appointmentData.startDate,
            endDate: appointmentData.endDate || '',
          });
        }
        setTreatments(treatmentsData);

        // Fetch tooth information for all teeth in treatments
        const uniqueToothIds = [...new Set(treatmentsData.map(t => t.tooth))];
        const teethPromises = uniqueToothIds.map(toothId => 
          toothService.getAll({ id: toothId, language: 'english' })
        );
        const teethResults = await Promise.all(teethPromises);
        
        const teethMap = new Map<number, ToothInfo>();
        teethResults.forEach((toothArray, index) => {
          if (toothArray.length > 0) {
            teethMap.set(uniqueToothIds[index], toothArray[0]);
          }
        });
        setTeethInfo(teethMap);

        // Fetch medicines for each treatment
        const medicinePromises = treatmentsData.map(treatment => 
          toothTreatmentMedicineService.getAll({ tooth_treatment: treatment.id })
        );
        const medicinesResults = await Promise.all(medicinePromises);
        
        const medicinesMap = new Map<number, ToothTreatmentMedicine[]>();
        treatmentsData.forEach((treatment, index) => {
          medicinesMap.set(treatment.id, medicinesResults[index]);
        });
        setTreatmentMedicines(medicinesMap);
      } catch (err: any) {
        console.error('Failed to fetch appointment data:', err);
        setError(err.response?.data?.message || 'Failed to fetch appointment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointmentData();
  }, [id]);

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    
    setIsSubmitting(true);
    setError('');
    try {
      await appointmentService.update(appointment.id, {
        startDate: editedAppointment.startDate,
        endDate: editedAppointment.endDate || null,
      });
      setShowEditAppointment(false);
      // Refresh data
      const appointmentsData = await appointmentService.getAll();
      const updatedAppointment = appointmentsData.find(a => a.id === appointment.id);
      if (updatedAppointment) {
        setAppointment(updatedAppointment);
      }
    } catch (err: any) {
      console.error('Failed to update appointment:', err);
      setError(err.response?.data?.message || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddTreatment = async () => {
    if (!appointment) return;
    
    setShowAddTreatment(true);
    setError('');
    try {
      const [treatmentsData, teethData] = await Promise.all([
        treatmentService.getAll(),
        patientService.getPatientTeeth(appointment.patient.id)
      ]);
      setAvailableTreatments(treatmentsData);
      setPatientTeeth(teethData);
      setNewTreatment({
        appointment_id: appointment.id,
        treatment_id: 0,
        patient_id: appointment.patient.id,
        tooth_id: 0,
        description: '',
      });
    } catch (err: any) {
      console.error('Failed to fetch treatments/teeth:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    
    setIsAddingTreatment(true);
    setError('');
    try {
      await toothTreatmentService.create(newTreatment);
      setShowAddTreatment(false);
      setNewTreatment({ appointment_id: 0, treatment_id: 0, patient_id: 0, tooth_id: 0, description: '' });
      
      // Refresh treatment data
      const treatmentsData = await toothTreatmentService.getAll({ appointment: appointment.id });
      setTreatments(treatmentsData);

      // Fetch tooth information for new treatments
      const uniqueToothIds = [...new Set(treatmentsData.map(t => t.tooth))];
      const teethPromises = uniqueToothIds.map(toothId => 
        toothService.getAll({ id: toothId, language: 'english' })
      );
      const teethResults = await Promise.all(teethPromises);
      
      const teethMap = new Map<number, ToothInfo>();
      teethResults.forEach((toothArray, index) => {
        if (toothArray.length > 0) {
          teethMap.set(uniqueToothIds[index], toothArray[0]);
        }
      });
      setTeethInfo(teethMap);

      // Fetch medicines for all treatments
      const medicinePromises = treatmentsData.map(treatment => 
        toothTreatmentMedicineService.getAll({ tooth_treatment: treatment.id })
      );
      const medicinesResults = await Promise.all(medicinePromises);
      
      const medicinesMap = new Map<number, ToothTreatmentMedicine[]>();
      treatmentsData.forEach((treatment, index) => {
        medicinesMap.set(treatment.id, medicinesResults[index]);
      });
      setTreatmentMedicines(medicinesMap);
    } catch (err: any) {
      console.error('Failed to create treatment:', err);
      setError(err.response?.data?.message || 'Failed to create treatment');
    } finally {
      setIsAddingTreatment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
            Loading appointment details...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg text-red-700 p-4 text-center">
            {error}
          </div>
        </main>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-blue-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
            Appointment not found.
          </div>
        </main>
      </div>
    );
  }

  // Calculate total fee
  const calculateTotalFee = () => {
    if (!appointment) return 0;
    
    // Sum of all treatment prices
    const treatmentTotal = treatments.reduce((sum, treatment) => sum + treatment.treatment.price, 0);
    
    // Sum of all medicine prices
    const medicineTotal = Array.from(treatmentMedicines.values())
      .flat()
      .reduce((sum, med) => sum + med.medicine.price, 0);
    
    // Total = treatments + medicines - discount
    const discount = appointment.discountFee || 0;
    return treatmentTotal + medicineTotal - discount;
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center space-x-2 text-teal-600 hover:text-teal-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Appointments</span>
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Appointment Details
            </h1>
            <button
              onClick={() => setShowEditAppointment(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {appointment.startDate}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {appointment.endDate || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Patient Name</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {appointment.patient.name}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Patient Surname</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {appointment.patient.surname}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <DollarSign className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Discount Fee</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {appointment.discountFee !== null ? `$${appointment.discountFee.toFixed(2)}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-teal-500">
            <div className="flex items-center justify-between bg-teal-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-6 h-6 text-teal-600" />
                <span className="text-lg font-semibold text-gray-900">Total Fee</span>
              </div>
              <span className="text-2xl font-bold text-teal-600">
                ${calculateTotalFee().toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">
              (Treatments + Medicines - Discount)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Treatments</h2>
            <button
              onClick={handleOpenAddTreatment}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Treatment</span>
            </button>
          </div>
          
          {treatments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No treatments found for this appointment.
            </p>
          ) : (
            <div className="space-y-4">
              {treatments.map((treatment) => {
                const toothInfo = teethInfo.get(treatment.tooth);
                const medicines = treatmentMedicines.get(treatment.id) || [];
                return (
                  <div 
                    key={treatment.id} 
                    className="border border-gray-200 rounded-lg p-6 hover:border-teal-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <FileText className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {treatment.treatment.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {treatment.treatment.description}
                          </p>
                          
                          {toothInfo && (
                            <div className="mb-3 p-3 bg-teal-50 rounded-md">
                              <p className="text-sm font-medium text-teal-900 mb-1">
                                {toothInfo.permanent ? 'Permanent' : 'Childish'} Tooth
                              </p>
                              <p className="text-sm text-teal-700 font-semibold">
                                {toothInfo.name}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm mb-3">
                            <span className="text-gray-500">
                              Price: <span className="font-medium text-gray-900">${treatment.treatment.price.toFixed(2)}</span>
                            </span>
                          </div>

                          {medicines.length > 0 && (
                            <div className="mb-3 p-3 bg-purple-50 rounded-md border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Pill className="w-4 h-4 text-purple-600" />
                                <p className="text-sm font-medium text-purple-900">Medicines Used:</p>
                              </div>
                              <div className="space-y-2">
                                {medicines.map((med) => (
                                  <div key={med.medicine.id} className="flex items-start justify-between">
                                    <div className="text-sm text-purple-700">
                                      <span className="font-semibold">{med.medicine.name}</span>
                                      {med.medicine.description && (
                                        <span className="text-purple-600"> - {med.medicine.description}</span>
                                      )}
                                    </div>
                                    <span className="text-sm font-semibold text-purple-900 ml-2">
                                      ${med.medicine.price.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {treatment.description && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-500 mb-1">Notes:</p>
                              <p className="text-sm text-gray-700">{treatment.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        className="ml-4 flex items-center space-x-1 px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors flex-shrink-0"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Appointment Modal */}
        {showEditAppointment && appointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Edit Appointment</h2>
                <button
                  onClick={() => setShowEditAppointment(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditAppointment} className="space-y-4">
                <div>
                  <label htmlFor="editStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="editStartDate"
                    required
                    value={editedAppointment.startDate}
                    onChange={(e) => setEditedAppointment({ ...editedAppointment, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="editEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="editEndDate"
                    value={editedAppointment.endDate}
                    onChange={(e) => setEditedAppointment({ ...editedAppointment, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Appointment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditAppointment(false)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Treatment Modal */}
        {showAddTreatment && appointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add Treatment</h2>
                <button
                  onClick={() => {
                    setShowAddTreatment(false);
                    setNewTreatment({ appointment_id: 0, treatment_id: 0, patient_id: 0, tooth_id: 0, description: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddTreatment} className="space-y-4">
                <div>
                  <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-1">
                    Treatment *
                  </label>
                  <select
                    id="treatment"
                    required
                    value={newTreatment.treatment_id}
                    onChange={(e) => setNewTreatment({ ...newTreatment, treatment_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={0}>Select a treatment</option>
                    {availableTreatments.map((treatment) => (
                      <option key={treatment.id} value={treatment.id}>
                        {treatment.name} - ${treatment.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tooth" className="block text-sm font-medium text-gray-700 mb-1">
                    Tooth *
                  </label>
                  <select
                    id="tooth"
                    required
                    value={newTreatment.tooth_id}
                    onChange={(e) => setNewTreatment({ ...newTreatment, tooth_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={0}>Select a tooth</option>
                    {patientTeeth.map((pt) => (
                      <option key={pt.tooth} value={pt.tooth}>
                        Tooth #{pt.toothNumber} ({pt.permanent === 'true' ? 'Permanent' : 'Childish'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="treatmentDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="treatmentDescription"
                    maxLength={300}
                    rows={3}
                    value={newTreatment.description}
                    onChange={(e) => setNewTreatment({ ...newTreatment, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter treatment description/notes"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newTreatment.description?.length || 0}/300 characters
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isAddingTreatment}
                    className="flex-1 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingTreatment ? 'Adding...' : 'Add Treatment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTreatment(false);
                      setNewTreatment({ appointment_id: 0, treatment_id: 0, patient_id: 0, tooth_id: 0, description: '' });
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

export default AppointmentDetail;

