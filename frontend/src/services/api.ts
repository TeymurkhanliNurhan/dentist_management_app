import axios from 'axios';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types/auth';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/Auth/SignIn', credentials);
    return response.data;
  },
  register: async (registerData: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/Auth/Register', registerData);
    return response.data;
  },
  verifyEmail: async (email: string, code: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/Auth/VerifyEmail', {
      gmail: email,
      code,
    });
    return response.data;
  },
  resendVerificationCode: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/Auth/ResendVerificationCode', {
      gmail: email,
    });
    return response.data;
  },
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/Auth/password-reset/code-request', {
      email,
    });
    return response.data;
  },
  verifyResetCode: async (email: string, code: string): Promise<{ valid: boolean }> => {
    const response = await api.post<{ valid: boolean }>('/Auth/password-resets/code-verification', {
      email,
      code,
    });
    return response.data;
  },
  resetPassword: async (email: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/Auth/password-resets', {
      email,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },
};

export const dentistService = {
  getById: async (id: number) => {
    const response = await api.get(`/dentist/${id}`);
    return response.data;
  },
  update: async (data: { name?: string; surname?: string; birthDate?: string }) => {
    const response = await api.patch(`/dentist`, data);
    return response.data;
  },
  updatePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const response = await api.patch(`/dentist/password`, data);
    return response.data;
  },
};

export interface Patient {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
}

export interface PatientFilters {
  name?: string;
  surname?: string;
  birthdate?: string;
}

export interface CreatePatientDto {
  name: string;
  surname: string;
  birthDate: string;
}

export interface UpdatePatientDto {
  name?: string;
  surname?: string;
  birthDate?: string;
}

export interface PatientTooth {
  patient: number;
  tooth: number;
  toothNumber: number;
  permanent: string;
}

export const patientService = {
  getAll: async (filters?: PatientFilters): Promise<Patient[]> => {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    if (filters?.surname) params.append('surname', filters.surname);
    if (filters?.birthdate) params.append('birthdate', filters.birthdate);
    
    const response = await api.get(`/patient?${params.toString()}`);
    return response.data;
  },
  getById: async (id: number): Promise<Patient> => {
    const response = await api.get(`/patient?id=${id}`);
    return response.data[0];
  },
  create: async (patient: CreatePatientDto): Promise<Patient> => {
    const response = await api.post('/patient', patient);
    return response.data;
  },
  update: async (id: number, patient: UpdatePatientDto): Promise<Patient> => {
    const response = await api.patch(`/patient/${id}`, patient);
    return response.data;
  },
  getPatientTeeth: async (patientId: number): Promise<PatientTooth[]> => {
    const response = await api.get(`/patient-tooth?patient=${patientId}`);
    return response.data;
  },
};

export interface Medicine {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface MedicineFilters {
  name?: string;
}

export interface CreateMedicineDto {
  name: string;
  description: string;
  price: number;
}

export interface UpdateMedicineDto {
  name?: string;
  description?: string;
  price?: number;
}

export const medicineService = {
  getAll: async (filters?: MedicineFilters): Promise<Medicine[]> => {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    
    const response = await api.get(`/medicine?${params.toString()}`);
    return response.data;
  },
  create: async (medicine: CreateMedicineDto): Promise<Medicine> => {
    const response = await api.post('/medicine', medicine);
    return response.data;
  },
  update: async (id: number, medicine: UpdateMedicineDto): Promise<Medicine> => {
    const response = await api.patch(`/medicine/${id}`, medicine);
    return response.data;
  },
};

export interface Treatment {
  id: number;
  name: string;
  description: string;
  price: number;
}

export interface TreatmentFilters {
  name?: string;
}

export interface CreateTreatmentDto {
  name: string;
  description: string;
  price: number;
}

export interface UpdateTreatmentDto {
  name?: string;
  description?: string;
  price?: number;
}

export const treatmentService = {
  getAll: async (filters?: TreatmentFilters): Promise<Treatment[]> => {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    
    const response = await api.get(`/treatment?${params.toString()}`);
    return response.data;
  },
  create: async (treatment: CreateTreatmentDto): Promise<Treatment> => {
    const response = await api.post('/treatment', treatment);
    return response.data;
  },
  update: async (id: number, treatment: UpdateTreatmentDto): Promise<Treatment> => {
    const response = await api.patch(`/treatment/${id}`, treatment);
    return response.data;
  },
};

export interface ToothTreatment {
  id: number;
  patient: number;
  tooth: number;
  appointment: {
    id: number;
    startDate: string;
    endDate: string | null;
  };
  treatment: {
    id: number;
    name: string;
    description: string;
    price: number;
  };
  description: string | null;
}

export interface ToothTreatmentFilters {
  id?: number;
  appointment?: number;
  tooth?: number;
  patient?: number;
  treatment?: number;
}

export interface CreateToothTreatmentDto {
  appointment_id: number;
  treatment_id: number;
  patient_id: number;
  tooth_id: number;
  description?: string;
}

export interface UpdateToothTreatmentDto {
  treatment_id?: number;
  tooth_id?: number;
  description?: string | null;
}

export const toothTreatmentService = {
  getAll: async (filters?: ToothTreatmentFilters): Promise<ToothTreatment[]> => {
    const params = new URLSearchParams();
    if (filters?.id) params.append('id', filters.id.toString());
    if (filters?.appointment) params.append('appointment', filters.appointment.toString());
    if (filters?.tooth) params.append('tooth', filters.tooth.toString());
    if (filters?.patient) params.append('patient', filters.patient.toString());
    if (filters?.treatment) params.append('treatment', filters.treatment.toString());
    
    const response = await api.get(`/tooth-treatment?${params.toString()}`);
    return response.data;
  },
  create: async (toothTreatment: CreateToothTreatmentDto): Promise<ToothTreatment> => {
    const response = await api.post('/tooth-treatment', toothTreatment);
    return response.data;
  },
  update: async (id: number, toothTreatment: UpdateToothTreatmentDto): Promise<ToothTreatment> => {
    const response = await api.patch(`/tooth-treatment/${id}`, toothTreatment);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/tooth-treatment/${id}`);
    return response.data;
  },
};

export interface ToothInfo {
  id: number;
  number: number;
  permanent: boolean;
  upperJaw: boolean;
  name: string;
}

export interface ToothFilters {
  id?: number;
  number?: number;
  permanent?: boolean;
  upperJaw?: boolean;
  language: string;
}

export const toothService = {
  getAll: async (filters: ToothFilters): Promise<ToothInfo[]> => {
    const params = new URLSearchParams();
    if (filters.id) params.append('id', filters.id.toString());
    if (filters.number) params.append('number', filters.number.toString());
    if (filters.permanent !== undefined) params.append('permanent', filters.permanent.toString());
    if (filters.upperJaw !== undefined) params.append('upperJaw', filters.upperJaw.toString());
    params.append('language', filters.language);
    
    const response = await api.get(`/tooth?${params.toString()}`);
    return response.data;
  },
};

export interface ToothTreatmentMedicine {
  medicine: {
    id: number;
    name: string;
    description: string;
    price: number;
  };
  tooth_treatment: number;
}

export interface ToothTreatmentMedicineFilters {
  medicine?: number;
  tooth_treatment?: number;
}

export interface CreateToothTreatmentMedicineDto {
  tooth_treatment_id: number;
  medicine_id: number;
}

export const toothTreatmentMedicineService = {
  getAll: async (filters?: ToothTreatmentMedicineFilters): Promise<ToothTreatmentMedicine[]> => {
    const params = new URLSearchParams();
    if (filters?.medicine) params.append('medicine', filters.medicine.toString());
    if (filters?.tooth_treatment) params.append('tooth_treatment', filters.tooth_treatment.toString());
    
    const response = await api.get(`/tooth-treatment-medicine?${params.toString()}`);
    return response.data;
  },
  create: async (dto: CreateToothTreatmentMedicineDto) => {
    const response = await api.post('/tooth-treatment-medicine', dto);
    return response.data;
  },
  delete: async (toothTreatmentId: number, medicineId: number) => {
    const response = await api.delete(`/tooth-treatment-medicine/${toothTreatmentId}/${medicineId}`);
    return response.data;
  },
};

export interface Appointment {
  id: number;
  startDate: string;
  endDate: string | null;
  discountFee: number | null;
  patient: {
    id: number;
    name: string;
    surname: string;
  };
}

export interface AppointmentFilters {
  startDate?: string;
  patientName?: string;
  patientSurname?: string;
}

export interface CreateAppointmentDto {
  startDate: string;
  endDate?: string;
  discountFee?: number;
  patient_id: number;
}

export interface UpdateAppointmentDto {
  startDate?: string;
  endDate?: string | null;
  discountFee?: number | null;
}

export const appointmentService = {
  getAll: async (filters?: AppointmentFilters): Promise<Appointment[]> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.patientName) params.append('patientName', filters.patientName);
    if (filters?.patientSurname) params.append('patientSurname', filters.patientSurname);
    
    const response = await api.get(`/appointment?${params.toString()}`);
    return response.data;
  },
  create: async (appointment: CreateAppointmentDto): Promise<Appointment> => {
    const response = await api.post('/appointment', appointment);
    return response.data;
  },
  update: async (id: number, appointment: UpdateAppointmentDto): Promise<Appointment> => {
    const response = await api.patch(`/appointment/${id}`, appointment);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/appointment/${id}`);
    return response.data;
  },
};

export interface SubscriptionStatus {
  active: boolean;
  createdDate: string;
  lastPaymentDate: string | null;
  freeMonthEnd: string;
  isInFreeMonth: boolean;
  daysUntilExpiry: number | null;
}

export type PaymentMethod = 'paypal' | 'stripe';

export const subscriptionService = {
  getStatus: async (): Promise<SubscriptionStatus> => {
    const response = await api.get<SubscriptionStatus>('/subscription/status');
    return response.data;
  },
  createOrder: async (paymentMethod: PaymentMethod): Promise<{ 
    orderId?: string; 
    approvalUrl?: string; 
    clientSecret?: string; 
    paymentIntentId?: string; 
    publishableKey?: string;
  }> => {
    const response = await api.post('/subscription/create', { paymentMethod });
    return response.data;
  },
  capturePayment: async (orderId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/subscription/capture', { orderId });
    return response.data;
  },
  captureStripePayment: async (paymentIntentId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/subscription/capture-stripe', { paymentIntentId });
    return response.data;
  },
};

export default api;