import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, FileText, Edit, X, Pill, DollarSign, Plus, Trash } from 'lucide-react';
import Header from './Header';
import { appointmentService, toothTreatmentService, toothService, toothTreatmentMedicineService, treatmentService, patientService, medicineService } from '../services/api';
import type { Appointment, ToothTreatment, ToothInfo, ToothTreatmentMedicine, Treatment, PatientTooth, CreateToothTreatmentDto, Medicine } from '../services/api';

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
  const [confirmDeleteAppointment, setConfirmDeleteAppointment] = useState(false);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [availableTreatments, setAvailableTreatments] = useState<Treatment[]>([]);
  const [allTreatments, setAllTreatments] = useState<Treatment[]>([]);
  const [patientTeeth, setPatientTeeth] = useState<PatientTooth[]>([]);
  const [newTreatment, setNewTreatment] = useState<CreateToothTreatmentDto>({
    appointment_id: 0,
    treatment_id: 0,
    patient_id: 0,
    tooth_id: 0,
    description: '',
  });
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<number[]>([]);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [editingTreatmentId, setEditingTreatmentId] = useState<number | null>(null);
  const [editingFields, setEditingFields] = useState<{ treatment_id: number; tooth_id: number; description: string }>({
    treatment_id: 0,
    tooth_id: 0,
    description: '',
  });
  const [editingMedicineIds, setEditingMedicineIds] = useState<number[]>([]);
  const [confirmDeleteTreatmentId, setConfirmDeleteTreatmentId] = useState<number | null>(null);

  const TeethSelector = ({
    patientTeeth,
    onSelect,
    selectedToothId,
  }: {
    patientTeeth: PatientTooth[];
    onSelect: (toothId: number) => void;
    selectedToothId: number;
  }) => {
    const [isPermanent, setIsPermanent] = useState(true);

    const hasToothNumber = (toothNumber: number) =>
      patientTeeth.some((pt) => pt.toothNumber === toothNumber);

    const toothIdByNumber = (toothNumber: number): number | null => {
      const pt = patientTeeth.find((p) => p.toothNumber === toothNumber);
      return pt ? pt.tooth : null;
    };

    const ToothNumber = ({ number, top, left }: { number: number; top: string; left: string }) => {
      const enabled = hasToothNumber(number);
      const possibleToothId = toothIdByNumber(number);
      const isSelected = possibleToothId !== null && possibleToothId === selectedToothId;
      return (
        <div
          onClick={() => enabled && possibleToothId && onSelect(possibleToothId)}
          className={`absolute z-10 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all select-none ${
            enabled
              ? `text-black cursor-pointer hover:bg-teal-500 hover:text-white hover:scale-110 ${isSelected ? 'bg-teal-600 text-white scale-110' : ''}`
              : 'text-gray-400 cursor-not-allowed opacity-50'
          }`}
          style={{ top, left, pointerEvents: 'auto' }}
          title={enabled ? `Select Tooth #${number}` : `Tooth #${number} not available`}
        >
          {number}
        </div>
      );
    };

    return (
      <div className="w-full">
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setIsPermanent(!isPermanent)}
            className="px-3 py-1.5 bg-teal-500 text-white rounded-md text-sm font-medium hover:bg-teal-600 transition-colors"
          >
            {isPermanent ? 'Childish Teeth' : 'Permanent Teeth'}
          </button>
        </div>
        <div className="relative w-full" style={{ paddingBottom: '90%' }}>
          <img
            src={isPermanent ? '/images/32teeth_logo.jpg' : '/images/20teeth_logo.jpg'}
            alt="Teeth Diagram"
            className="absolute top-0 left-0 w-full h-full object-contain"
            style={{ pointerEvents: 'none', zIndex: 1 }}
          />

          {isPermanent ? (
            <>
              {/* Permanent Teeth positions borrowed from TeethDiagram */}
              <ToothNumber number={18} top="38.5%" left="31.7%" />
              <ToothNumber number={17} top="31%" left="30.6%" />
              <ToothNumber number={16} top="24%" left="31%" />
              <ToothNumber number={15} top="18%" left="32%" />
              <ToothNumber number={14} top="12.5%" left="34.2%" />
              <ToothNumber number={13} top="8%" left="36%" />
              <ToothNumber number={12} top="4.4%" left="39.5%" />
              <ToothNumber number={11} top="3%" left="44%" />

              <ToothNumber number={21} top="3%" left="49.3%" />
              <ToothNumber number={22} top="5%" left="54.3%" />
              <ToothNumber number={23} top="8%" left="57.6%" />
              <ToothNumber number={24} top="12.5%" left="59.7%" />
              <ToothNumber number={25} top="18.3%" left="61.7%" />
              <ToothNumber number={26} top="24.5%" left="62.2%" />
              <ToothNumber number={27} top="31%" left="62.7%" />
              <ToothNumber number={28} top="39%" left="61.7%" />

              <ToothNumber number={48} top="55%" left="32.9%" />
              <ToothNumber number={47} top="62.8%" left="31.3%" />
              <ToothNumber number={46} top="69.6%" left="32.1%" />
              <ToothNumber number={45} top="75.8%" left="33%" />
              <ToothNumber number={44} top="81.3%" left="34.5%" />
              <ToothNumber number={43} top="85.7%" left="36.5%" />
              <ToothNumber number={42} top="89.7%" left="40.1%" />
              <ToothNumber number={41} top="91%" left="45%" />

              <ToothNumber number={31} top="91%" left="50.2%" />
              <ToothNumber number={32} top="89%" left="55%" />
              <ToothNumber number={33} top="86%" left="59%" />
              <ToothNumber number={34} top="81.5%" left="60.5%" />
              <ToothNumber number={35} top="75.7%" left="62.3%" />
              <ToothNumber number={36} top="69.4%" left="62.8%" />
              <ToothNumber number={37} top="62.6%" left="63.4%" />
              <ToothNumber number={38} top="55%" left="62.5%" />
            </>
          ) : (
            <>
              {/* Childish Teeth positions borrowed from TeethDiagram */}
              <ToothNumber number={55} top="34%" left="28.4%" />
              <ToothNumber number={54} top="23.5%" left="30.2%" />
              <ToothNumber number={53} top="15%" left="33.5%" />
              <ToothNumber number={52} top="10%" left="38%" />
              <ToothNumber number={51} top="7.5%" left="43.7%" />

              <ToothNumber number={61} top="7.5%" left="51%" />
              <ToothNumber number={62} top="10%" left="57.5%" />
              <ToothNumber number={63} top="15%" left="62.5%" />
              <ToothNumber number={64} top="23.3%" left="66.5%" />
              <ToothNumber number={65} top="33.8%" left="68.5%" />

              <ToothNumber number={85} top="61.2%" left="28.7%" />
              <ToothNumber number={84} top="71.5%" left="30.6%" />
              <ToothNumber number={83} top="79.7%" left="33.8%" />
              <ToothNumber number={82} top="85%" left="38.1%" />
              <ToothNumber number={81} top="87.7%" left="44.4%" />

              <ToothNumber number={71} top="87.7%" left="51.2%" />
              <ToothNumber number={72} top="85%" left="57.9%" />
              <ToothNumber number={73} top="79.7%" left="62.9%" />
              <ToothNumber number={74} top="71.5%" left="66.9%" />
              <ToothNumber number={75} top="61.2%" left="68.6%" />
            </>
          )}
        </div>
      </div>
    );
  };

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
      const [treatmentsData, teethData, medsData] = await Promise.all([
        treatmentService.getAll(),
        patientService.getPatientTeeth(appointment.patient.id),
        medicineService.getAll(),
      ]);
      setAvailableTreatments(treatmentsData);
      setAllTreatments(treatmentsData);
      setPatientTeeth(teethData);
      setAvailableMedicines(medsData);
      setAllMedicines(medsData);
      setNewTreatment({
        appointment_id: appointment.id,
        treatment_id: 0,
        patient_id: appointment.patient.id,
        tooth_id: 0,
        description: '',
      });
      setSelectedMedicineIds([]);
    } catch (err: any) {
      console.error('Failed to fetch treatments/teeth:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    }
  };

  const handleAddTreatment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!appointment) return;
    
    setIsAddingTreatment(true);
    setError('');
    try {
      const created = await toothTreatmentService.create(newTreatment);
      const createdId = created?.id;
      setShowAddTreatment(false);
      setNewTreatment({ appointment_id: 0, treatment_id: 0, patient_id: 0, tooth_id: 0, description: '' });
      if (createdId && selectedMedicineIds.length > 0) {
        await Promise.all(
          selectedMedicineIds.map((mid) =>
            toothTreatmentMedicineService.create({ tooth_treatment_id: createdId, medicine_id: mid })
          )
        );
      }
      
      const treatmentsData = await toothTreatmentService.getAll({ appointment: appointment.id });
      setTreatments(treatmentsData);

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

  const beginEditTreatment = async (tt: ToothTreatment) => {
    setError('');
    setEditingTreatmentId(tt.id);
    if (allTreatments.length === 0) {
      const ts = await treatmentService.getAll();
      setAllTreatments(ts);
      setAvailableTreatments(ts);
    }
    if (allMedicines.length === 0) {
      const ms = await medicineService.getAll();
      setAllMedicines(ms);
      setAvailableMedicines(ms);
    }
    if (patientTeeth.length === 0 && appointment) {
      const teethData = await patientService.getPatientTeeth(appointment.patient.id);
      setPatientTeeth(teethData);
    }
    setEditingFields({
      treatment_id: tt.treatment.id,
      tooth_id: tt.tooth,
      description: tt.description || '',
    });
    try {
      const meds = await toothTreatmentMedicineService.getAll({ tooth_treatment: tt.id });
      setEditingMedicineIds(meds.map((m) => m.medicine.id));
    } catch (e) {
      setEditingMedicineIds([]);
    }
  };

  const cancelEditTreatment = () => {
    setEditingTreatmentId(null);
    setEditingMedicineIds([]);
  };

  const saveEditTreatment = async (tt: ToothTreatment) => {
    if (!appointment) return;
    setIsSubmitting(true);
    setError('');
    try {
      await toothTreatmentService.update(tt.id, {
        treatment_id: editingFields.treatment_id,
        tooth_id: editingFields.tooth_id,
        description: editingFields.description || null,
      });
      const currentMeds = await toothTreatmentMedicineService.getAll({ tooth_treatment: tt.id });
      const currentIds = currentMeds.map((m) => m.medicine.id);
      const toAdd = editingMedicineIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !editingMedicineIds.includes(id));
      await Promise.all([
        ...toAdd.map((id) => toothTreatmentMedicineService.create({ tooth_treatment_id: tt.id, medicine_id: id })),
        ...toRemove.map((id) => toothTreatmentMedicineService.delete(tt.id, id)),
      ]);

      const treatmentsData = await toothTreatmentService.getAll({ appointment: appointment.id });
      setTreatments(treatmentsData);

      const uniqueToothIds = [...new Set(treatmentsData.map((t) => t.tooth))];
      const teethPromises = uniqueToothIds.map((toothId) => toothService.getAll({ id: toothId, language: 'english' }));
      const teethResults = await Promise.all(teethPromises);
      const teethMap = new Map<number, ToothInfo>();
      teethResults.forEach((arr, idx) => {
        if (arr.length > 0) teethMap.set(uniqueToothIds[idx], arr[0]);
      });
      setTeethInfo(teethMap);

      const medicinePromises = treatmentsData.map((t) => toothTreatmentMedicineService.getAll({ tooth_treatment: t.id }));
      const medicinesResults = await Promise.all(medicinePromises);
      const medicinesMap = new Map<number, ToothTreatmentMedicine[]>();
      treatmentsData.forEach((t, idx) => medicinesMap.set(t.id, medicinesResults[idx]));
      setTreatmentMedicines(medicinesMap);

      cancelEditTreatment();
    } catch (err: any) {
      console.error('Failed to update treatment:', err);
      setError(err.response?.data?.message || 'Failed to update treatment');
    } finally {
      setIsSubmitting(false);
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

  const calculateTotalFee = () => {
    if (!appointment) return 0;
    
    const treatmentTotal = treatments.reduce((sum, treatment) => sum + treatment.treatment.price, 0);
    
    const medicineTotal = Array.from(treatmentMedicines.values())
      .flat()
      .reduce((sum, med) => sum + med.medicine.price, 0);
    
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
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => setShowEditAppointment(true)}
                className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors min-w-[96px]"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setConfirmDeleteAppointment(true)}
                className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors min-w-[96px]"
              >
                <Trash className="w-4 h-4" />
                <span>Delete</span>
              </button>

              {confirmDeleteAppointment && (
                <div className="mt-1 w-64 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow-sm">
                  <p className="mb-2 font-medium">Delete this appointment?</p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmDeleteAppointment(false)}
                      className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!appointment) return;
                        try {
                          await appointmentService.delete(appointment.id);
                          navigate('/appointments');
                        } catch (err: any) {
                          setError(err.response?.data?.message || 'Failed to delete appointment');
                        }
                      }}
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
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

          {showAddTreatment && appointment && (
            <div className="mb-8 border border-teal-200 rounded-lg p-6 bg-teal-50/40">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Treatment</h3>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search treatment by name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        if (!q) {
                          setAvailableTreatments(allTreatments);
                        } else {
                          const filtered = allTreatments.filter(t => t.name.toLowerCase().includes(q));
                          setAvailableTreatments(filtered);
                        }
                      }}
                    />
                  </div>
                  <div className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white">
                    {availableTreatments.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">No treatments found</div>
                    ) : (
                      availableTreatments.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNewTreatment({ ...newTreatment, treatment_id: t.id })}
                          className={`w-full text-left px-4 py-2 border-b last:border-b-0 hover:bg-teal-50 transition-colors ${newTreatment.treatment_id === t.id ? 'bg-teal-100' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{t.name}</span>
                            <span className="text-sm font-semibold text-gray-700">${t.price.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{t.description}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Tooth</h3>
                  <div className="w-full max-w-xl mx-auto bg-white rounded-lg p-3 shadow-sm">
                    <TeethSelector
                      patientTeeth={patientTeeth}
                      onSelect={(toothId) => setNewTreatment({ ...newTreatment, tooth_id: toothId })}
                      selectedToothId={newTreatment.tooth_id}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Medicines (optional)</h3>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search medicine by name..."
                      value={medicineQuery}
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        setMedicineQuery(e.target.value);
                        if (!q) {
                          setAvailableMedicines(allMedicines);
                        } else {
                          setAvailableMedicines(allMedicines.filter(m => m.name.toLowerCase().includes(q)));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white">
                    {availableMedicines.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">No medicines found</div>
                    ) : (
                      availableMedicines.map((m) => {
                        const checked = selectedMedicineIds.includes(m.id);
                        return (
                          <label key={m.id} className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 cursor-pointer hover:bg-purple-50">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMedicineIds([...selectedMedicineIds, m.id]);
                                  } else {
                                    setSelectedMedicineIds(selectedMedicineIds.filter(id => id !== m.id));
                                  }
                                }}
                                className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{m.name}</div>
                                <div className="text-xs text-gray-600">{m.description}</div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">${m.price.toFixed(2)}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="inlineDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  id="inlineDescription"
                  rows={3}
                  maxLength={300}
                  value={newTreatment.description}
                  onChange={(e) => setNewTreatment({ ...newTreatment, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter treatment description/notes"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleAddTreatment}
                  disabled={isAddingTreatment || newTreatment.treatment_id === 0 || newTreatment.tooth_id === 0}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingTreatment ? 'Adding...' : 'Add Treatment'}
                </button>
                <button
                  onClick={() => setShowAddTreatment(false)}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
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
                      <div className="ml-4 flex flex-col gap-2 flex-shrink-0">
                        {editingTreatmentId === treatment.id ? (
                          <>
                            <button
                              onClick={() => saveEditTreatment(treatment)}
                              className="px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                              disabled={isSubmitting}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditTreatment}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => beginEditTreatment(treatment)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDeleteTreatmentId(treatment.id)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        {confirmDeleteTreatmentId === treatment.id && (
                          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow-sm">
                            <p className="mb-2 font-medium">Delete this treatment?</p>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setConfirmDeleteTreatmentId(null)}
                                className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await toothTreatmentService.delete(treatment.id);
                                    if (appointment) {
                                      const treatmentsData = await toothTreatmentService.getAll({ appointment: appointment.id });
                                      setTreatments(treatmentsData);
                                      const medPromises = treatmentsData.map((t) => toothTreatmentMedicineService.getAll({ tooth_treatment: t.id }));
                                      const medsRes = await Promise.all(medPromises);
                                      const medMap = new Map<number, ToothTreatmentMedicine[]>();
                                      treatmentsData.forEach((t, idx) => medMap.set(t.id, medsRes[idx]));
                                      setTreatmentMedicines(medMap);
                                    }
                                    if (editingTreatmentId === treatment.id) {
                                      cancelEditTreatment();
                                    }
                                  } catch (err: any) {
                                    setError(err.response?.data?.message || 'Failed to delete treatment');
                                  } finally {
                                    setConfirmDeleteTreatmentId(null);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {editingTreatmentId === treatment.id && (
                      <div className="mt-4 rounded-md border border-teal-200 p-4 bg-teal-50/40">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Change Treatment</h4>
                            <div className="max-h-56 overflow-auto rounded-md border border-gray-200 bg-white">
                              {allTreatments.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setEditingFields({ ...editingFields, treatment_id: t.id })}
                                  className={`w-full text-left px-4 py-2 border-b last:border-b-0 hover:bg-teal-50 ${editingFields.treatment_id === t.id ? 'bg-teal-100' : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{t.name}</span>
                                    <span className="text-sm font-semibold text-gray-700">${t.price.toFixed(2)}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Change Tooth</h4>
                            <TeethSelector
                              patientTeeth={patientTeeth}
                              onSelect={(toothId) => setEditingFields({ ...editingFields, tooth_id: toothId })}
                              selectedToothId={editingFields.tooth_id}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Medicines</h4>
                            <div className="max-h-56 overflow-auto rounded-md border border-gray-200 bg-white">
                              {allMedicines.map((m) => {
                                const checked = editingMedicineIds.includes(m.id);
                                return (
                                  <label key={m.id} className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 cursor-pointer hover:bg-purple-50">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          if (e.target.checked) setEditingMedicineIds([...editingMedicineIds, m.id]);
                                          else setEditingMedicineIds(editingMedicineIds.filter((id) => id !== m.id));
                                        }}
                                        className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                                      />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{m.name}</div>
                                        <div className="text-xs text-gray-600">{m.description}</div>
                                      </div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">${m.price.toFixed(2)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
                            <textarea
                              rows={3}
                              value={editingFields.description}
                              onChange={(e) => setEditingFields({ ...editingFields, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Enter notes"
                            />
                          </div>
                        </div>
                      </div>
                    )}
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

        {/* Inline form replaces modal above; modal removed */}
      </main>
    </div>
  );
};

export default AppointmentDetail;

