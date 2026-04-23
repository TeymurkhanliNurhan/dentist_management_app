import axios from 'axios';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types/auth';

/**
 * Nest uses global prefix `/api`. Production often sets `VITE_API_BASE_URL` to the
 * service origin only (e.g. `https://app.onrender.com`), which would POST to
 * `/Auth/SignIn` on that host and get "Cannot POST". Append `/api` only when the
 * value is an absolute URL with an empty path. Relative bases (e.g. `/api` for Vite
 * proxy) are left unchanged.
 */
function resolveApiBaseUrl(envValue: string | undefined): string {
  const raw = envValue?.trim().replace(/\/+$/, '') ?? '';
  if (!raw) return 'http://localhost:3000/api';
  if (raw.startsWith('/')) return raw;
  if (!/^https?:\/\//i.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const p = (u.pathname || '/').replace(/\/+$/, '') || '/';
    if (p === '/') return `${u.origin}/api`;
    return raw;
  } catch {
    return raw;
  }
}

/** Set VITE_API_BASE_URL at build time (e.g. `https://host.onrender.com` or `https://host.onrender.com/api`). */
export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

const PUBLIC_AUTH_PATHS = new Set([
  '/Auth/SignIn',
  '/Auth/Register',
  '/Auth/VerifyEmail',
  '/Auth/ResendVerificationCode',
  '/Auth/password-reset/code-request',
  '/Auth/password-resets/code-verification',
  '/Auth/password-resets',
]);

function isPublicAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0]?.replace(/\/{2,}/g, '/') ?? '';
  return PUBLIC_AUTH_PATHS.has(path);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (config.baseURL) {
      config.baseURL = config.baseURL.replace(/\/+$/, '');
    }
    if (config.url) {
      const normalizedPath = config.url.replace(/\/{2,}/g, '/');
      config.url = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    }

    const token = localStorage.getItem('access_token');
    if (token && !isPublicAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
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
  getAll: async (): Promise<DentistProfile[]> => {
    const response = await api.get('/dentist');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/dentist/${id}`);
    return response.data;
  },
  create: async (payload: { staffId: number }) => {
    const response = await api.post('/dentist', payload);
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

export interface DentistProfile {
  id: number;
  staffId: number;
  staff: {
    id: number;
    name: string;
    surname: string;
    birthDate: string;
    gmail: string;
    clinicId: number;
  };
}

/** Staff list row from `GET /staff` (director context uses clinic-wide list). */
export interface StaffListRecord {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
  gmail: string;
  isEmailVerified: boolean;
  verificationCodeExpiry: string | null;
  active: boolean;
  startDate: string;
  endDate: string | null;
  clinicId: number;
  role: string | null;
}

export const staffService = {
  getAll: async (filters?: { id?: number; active?: boolean }): Promise<StaffListRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.id != null) params.append('id', String(filters.id));
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    const query = params.toString();
    const response = await api.get<StaffListRecord[]>(`/staff${query ? `?${query}` : ''}`);
    return response.data;
  },
  create: async (payload: {
    name: string;
    surname: string;
    birthDate: string;
    gmail: string;
    password: string;
    startDate: string;
    active?: boolean;
  }): Promise<StaffListRecord> => {
    const response = await api.post<StaffListRecord>('/staff', payload);
    return response.data;
  },
};

export const nurseService = {
  create: async (payload: { staffId: number }) => {
    const response = await api.post('/nurse', payload);
    return response.data;
  },
};

export const frontDeskWorkerService = {
  create: async (payload: { staffId: number }) => {
    const response = await api.post('/front-desk-worker', payload);
    return response.data;
  },
};

export const directorService = {
  create: async (payload: { staffId: number }) => {
    const response = await api.post('/director', payload);
    return response.data;
  },
};

export interface SalaryRecord {
  staffId: number;
  salary: number | null;
  salaryDay: number | null;
  treatmentPercentage: number | null;
}

export interface CreateSalaryDto {
  staffId: number;
  salary?: number;
  salaryDay?: number;
  treatmentPercentage?: number;
}

export interface UpdateSalaryDto {
  salary?: number | null;
  salaryDay?: number | null;
  treatmentPercentage?: number | null;
}

export interface FinanceOverviewSalaryRow {
  staffId: number;
  name: string;
  surname: string;
  role: string | null;
  amount: number;
  type: 'percentage' | 'fixed';
  percentage: number | null;
  treatmentCost: number | null;
}

export interface FinanceOverviewResponse {
  period: {
    year: number;
    month: number;
  };
  monthlyIncome: number;
  debt: number;
  incomeBreakdown: {
    byDentists: Array<{
      staffId: number;
      name: string;
      surname: string;
      amount: number;
    }>;
  };
  outcome: {
    total: number;
    totalSalaries: number;
    totalOtherPaymentDetails: number;
    totalMedicinePurchases: number;
    salaries: FinanceOverviewSalaryRow[];
    medicinePurchases: {
      total: number;
      byMedicine: Array<{
        medicineName: string;
        totalCost: number;
      }>;
      items: Array<{
        id: number;
        date: string | null;
        medicineId: number | null;
        medicineName: string | null;
        count: number;
        pricePerOne: number;
        totalPrice: number;
      }>;
    };
  };
  otherPaymentDetails: {
    total: number;
    byCategory: Array<{
      name: string;
      totalCost: number;
    }>;
    items: Array<{
      id: number;
      date: string;
      cost: number;
      expenseId: number | null;
      expenseName: string | null;
      purchaseMedicines: Array<{
        id: number;
        medicineName: string | null;
        count: number;
        totalPrice: number;
      }>;
    }>;
  };
}

export interface CreateExpenseDto {
  name: string;
  description?: string;
  fixedCost?: number;
  dayOfMonth?: number;
}

export interface ExpenseRecord {
  id: number;
  name: string;
  description: string | null;
  fixedCost: number | null;
  dayOfMonth: number | null;
}

export interface CreatePaymentDetailsDto {
  date: string;
  cost: number;
  expenseId?: number;
  salaryId?: number;
}

export const salaryService = {
  getAll: async (filters?: { staffId?: number; salaryDay?: number }): Promise<SalaryRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.staffId != null) params.append('staffId', String(filters.staffId));
    if (filters?.salaryDay != null) params.append('salaryDay', String(filters.salaryDay));
    const query = params.toString();
    const response = await api.get<SalaryRecord[]>(`/salary${query ? `?${query}` : ''}`);
    return response.data;
  },
  create: async (data: CreateSalaryDto): Promise<SalaryRecord> => {
    const response = await api.post<SalaryRecord>('/salary', data);
    return response.data;
  },
  update: async (staffId: number, data: UpdateSalaryDto): Promise<SalaryRecord> => {
    const response = await api.patch<SalaryRecord>(`/salary/${staffId}`, data);
    return response.data;
  },
};

export const paymentDetailsService = {
  getFinanceOverview: async (filters?: {
    year?: number;
    month?: number;
  }): Promise<FinanceOverviewResponse> => {
    const params = new URLSearchParams();
    if (filters?.year != null) params.append('year', String(filters.year));
    if (filters?.month != null) params.append('month', String(filters.month));
    const query = params.toString();
    const response = await api.get<FinanceOverviewResponse>(
      `/payment-details/finance-overview${query ? `?${query}` : ''}`,
    );
    return response.data;
  },
  create: async (payload: CreatePaymentDetailsDto) => {
    const response = await api.post('/payment-details', payload);
    return response.data;
  },
};

export const expenseService = {
  create: async (payload: CreateExpenseDto): Promise<ExpenseRecord> => {
    const response = await api.post<ExpenseRecord>('/expense', payload);
    return response.data;
  },
};

let currentDentistProfilePromise: Promise<DentistProfile | null> | null = null;

/** Clears cached dentist profile so the next session fetches fresh data after login. */
export function resetCachedDentistProfile() {
  currentDentistProfilePromise = null;
}

const getCurrentDentistProfile = async (): Promise<DentistProfile | null> => {
  if (currentDentistProfilePromise) return currentDentistProfilePromise;

  currentDentistProfilePromise = (async () => {
    const dentistIdRaw = localStorage.getItem('dentistId');
    if (!dentistIdRaw) return null;
    const dentistId = Number(dentistIdRaw);
    if (!Number.isFinite(dentistId) || dentistId <= 0) return null;

    try {
      const profile = await dentistService.getById(dentistId);
      return profile as DentistProfile;
    } catch {
      return null;
    }
  })();

  return currentDentistProfilePromise;
};

export interface Patient {
  id: number;
  name: string;
  surname: string;
  birthDate: string;
  /** Present on POST /patient response; patients belong to a clinic. */
  clinic?: { id: number };
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
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/patient/${id}`);
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
  stock: number;
  purchasePrice: number;
}

export interface MedicineFilters {
  name?: string;
  clinic_id?: number;
}

export interface CreateMedicineDto {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  purchasePrice?: number;
}

export interface UpdateMedicineDto {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  purchasePrice?: number;
}

export interface CreatePurchaseSessionItemDto {
  medicineId: number;
  count: number;
  pricePerOne: number;
}

export interface CreatePurchaseSessionDto {
  items: CreatePurchaseSessionItemDto[];
}

export const medicineService = {
  getAll: async (filters?: MedicineFilters): Promise<Medicine[]> => {
    const params = new URLSearchParams();
    const effectiveClinicId =
      filters?.clinic_id ??
      (await getCurrentDentistProfile())?.staff?.clinicId;
    if (filters?.name) params.append('name', filters.name);
    if (effectiveClinicId) params.append('clinic_id', effectiveClinicId.toString());
    
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

export const purchaseMedicineService = {
  createSession: async (payload: CreatePurchaseSessionDto) => {
    const response = await api.post('/purchase-medicine/session', payload);
    return response.data;
  },
};

export type TreatmentPricePer = 'tooth' | 'chin' | 'mouth';

export interface Treatment {
  id: number;
  name: string;
  description: string;
  price: number;
  pricePer: TreatmentPricePer | null;
  dentistCount: number;
}

export interface TreatmentFilters {
  name?: string;
  clinic_id?: number;
}

export interface CreateTreatmentDto {
  name: string;
  description: string;
  price: number;
  pricePer?: TreatmentPricePer | null;
}

export interface UpdateTreatmentDto {
  name?: string;
  description?: string;
  price?: number;
  pricePer?: TreatmentPricePer | null;
}

export const treatmentService = {
  getAll: async (filters?: TreatmentFilters): Promise<Treatment[]> => {
    const params = new URLSearchParams();
    const effectiveClinicId =
      filters?.clinic_id ??
      (await getCurrentDentistProfile())?.staff?.clinicId;
    if (filters?.name) params.append('name', filters.name);
    if (effectiveClinicId) params.append('clinic_id', effectiveClinicId.toString());
    
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

export interface DentistTreatmentLink {
  treatment: number;
  dentist: number;
}

export interface DentistTreatmentFilters {
  treatment?: number;
  dentist?: number;
}

export const dentistTreatmentService = {
  getAll: async (filters?: DentistTreatmentFilters): Promise<DentistTreatmentLink[]> => {
    const params = new URLSearchParams();
    if (filters?.treatment !== undefined) params.append('treatment', filters.treatment.toString());
    if (filters?.dentist !== undefined) params.append('dentist', filters.dentist.toString());
    const response = await api.get(`/dentist-treatment?${params.toString()}`);
    return response.data;
  },
  create: async (treatment: number, dentist: number): Promise<DentistTreatmentLink> => {
    const response = await api.post('/dentist-treatment', { treatment, dentist });
    return response.data;
  },
  remove: async (treatment: number, dentist: number): Promise<{ message: string }> => {
    const params = new URLSearchParams({ treatment: treatment.toString(), dentist: dentist.toString() });
    const response = await api.delete(`/dentist-treatment?${params.toString()}`);
    return response.data;
  },
};

export interface ToothTreatment {
  id: number;
  patient: number;
  tooth: number;
  feeSnapshot: number;
  dentist?: {
    id: number;
    staff: { name: string; surname: string };
  } | null;
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
    pricePer: TreatmentPricePer | null;
  };
  lastRandevueDate?: string | null;
  /** Distinct randevues linked to this placement (via tooth rows). */
  linkedRandevues?: Array<{
    id: number;
    date: string;
    endTime: string;
    room: { id: number; number: string | null; description: string | null } | null;
    nurse: { id: number; name: string; surname: string } | null;
    dentist: { id: number; name: string; surname: string } | null;
  }>;
  description: string | null;
  toothTreatmentTeeth: {
    id: number;
    toothId: number;
    patientId: number;
  }[];
}

export interface ToothTreatmentFilters {
  id?: number;
  appointment?: number;
  tooth?: number;
  patient?: number;
  treatment?: number;
  dentist?: number;
}

export interface CreateToothTreatmentDto {
  appointment_id: number;
  treatment_id: number;
  patient_id: number;
  tooth_ids: number[];
  description?: string;
}

export interface UpdateToothTreatmentDto {
  treatment_id?: number;
  tooth_ids?: number[];
  description?: string | null;
}

export interface ToothTreatmentTeeth {
  id: number;
  tooth_treatment_id: number;
  tooth_id: number;
  patient_id: number;
}

export interface GetToothTreatmentTeethDto {
  id?: number;
  tooth_treatment_id?: number;
  tooth_id?: number;
  patient_id?: number;
}

export interface Media {
  id: number;
  photo_url: string;
  name: string;
  description: string | null;
  toothTreatment: {
    id: number;
  };
}

export interface MediaFilters {
  id?: number;
  name?: string;
  tooth_treatment_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateMediaDto {
  name: string;
  description?: string;
  tooth_treatment_id: number;
}

export interface UpdateMediaDto {
  name?: string;
  description?: string;
  tooth_treatment_id?: number;
  photo_url?: string;
}

export const toothTreatmentTeethService = {
  getAll: async (filters?: GetToothTreatmentTeethDto): Promise<ToothTreatmentTeeth[]> => {
    const params = new URLSearchParams();
    if (filters?.id) params.append('id', filters.id.toString());
    if (filters?.tooth_treatment_id) params.append('tooth_treatment_id', filters.tooth_treatment_id.toString());
    if (filters?.tooth_id) params.append('tooth_id', filters.tooth_id.toString());
    if (filters?.patient_id) params.append('patient_id', filters.patient_id.toString());

    const response = await api.get(`/tooth-treatment-teeth?${params.toString()}`);
    return response.data;
  },
};

export const toothTreatmentService = {
  getAll: async (filters?: ToothTreatmentFilters): Promise<ToothTreatment[]> => {
    const params = new URLSearchParams();
    if (filters?.id) params.append('id', filters.id.toString());
    if (filters?.appointment) params.append('appointment', filters.appointment.toString());
    if (filters?.tooth) params.append('tooth', filters.tooth.toString());
    if (filters?.patient) params.append('patient', filters.patient.toString());
    if (filters?.treatment) params.append('treatment', filters.treatment.toString());
    if (filters?.dentist) params.append('dentist', filters.dentist.toString());

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
  quantity: number;
}

export interface ToothTreatmentMedicineFilters {
  medicine?: number;
  tooth_treatment?: number;
}

export interface CreateToothTreatmentMedicineDto {
  tooth_treatment_id: number;
  medicine_id: number;
  quantity?: number;
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
  updateQuantity: async (toothTreatmentId: number, medicineId: number, quantity: number) => {
    const response = await api.patch(`/tooth-treatment-medicine/${toothTreatmentId}/${medicineId}/quantity`, { quantity });
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
  calculatedFee: number;
  chargedFee: number | null;
  discountFee: number | null;
  patient: {
    id: number;
    name: string;
    surname: string;
  };
}

export interface AppointmentFilters {
  startDate?: string;
  patient?: number;
  patientName?: string;
  patientSurname?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAppointments {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAppointmentDto {
  startDate: string;
  endDate?: string;
  chargedFee?: number;
  patient_id: number;
}

export interface UpdateAppointmentDto {
  startDate?: string;
  endDate?: string | null;
  chargedFee?: number | null;
}

export interface Randevue {
  id: number;
  date: string;
  endTime: string;
  status: string;
  note: string | null;
  patient: {
    id: number;
    name: string;
    surname: string;
  };
  appointment: {
    id: number;
    startDate: string;
    endDate: string | null;
  } | null;
  room?: { id: number; number: string; description: string };
  nurse: { id: number; name?: string; surname?: string } | null;
  dentist?: { id: number; name?: string; surname?: string } | null;
}

export interface CreateRandevueDto {
  startDateTime: string;
  endDateTime: string;
  patient_id: number;
  dentist_id?: number;
  note?: string;
  appointment_id?: number;
  create_new_appointment?: boolean;
  appointment_start_date?: string;
  room_id?: number;
  nurse_id?: number;
  tooth_treatment_ids?: number[];
}

export interface UpdateRandevueDto {
  startDateTime?: string;
  endDateTime?: string;
  patient_id?: number;
  dentist_id?: number;
  note?: string;
  clear_appointment?: boolean;
  appointment_id?: number;
  create_new_appointment?: boolean;
  appointment_start_date?: string;
  room_id?: number;
  nurse_id?: number;
  clear_nurse?: boolean;
  append_tooth_treatment_ids?: number[];
  remove_tooth_treatment_ids?: number[];
}

export const randevueService = {
  getForRange: async (from: string, to: string): Promise<Randevue[]> => {
    const params = new URLSearchParams({ from, to });
    const response = await api.get<Randevue[]>(`/randevue?${params.toString()}`);
    return response.data;
  },
  create: async (dto: CreateRandevueDto): Promise<Randevue> => {
    const response = await api.post<Randevue>('/randevue', dto);
    return response.data;
  },
  update: async (id: number, dto: UpdateRandevueDto): Promise<Randevue> => {
    const response = await api.patch<Randevue>(`/randevue/${id}`, dto);
    return response.data;
  },
};

export const appointmentService = {
  getAll: async (filters?: AppointmentFilters): Promise<PaginatedAppointments> => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.patient !== undefined) params.append('patient', filters.patient.toString());
    if (filters?.patientName) params.append('patientName', filters.patientName);
    if (filters?.patientSurname) params.append('patientSurname', filters.patientSurname);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
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

export const mediaService = {
  getAll: async (filters?: MediaFilters): Promise<{ medias: Media[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.id) params.append('id', filters.id.toString());
    if (filters?.name) params.append('name', filters.name);
    if (filters?.tooth_treatment_id) params.append('tooth_treatment_id', filters.tooth_treatment_id.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/media?${params.toString()}`);
    return response.data;
  },
  getById: async (id: number): Promise<Media> => {
    const response = await api.get(`/media/${id}`);
    return response.data;
  },
  create: async (formData: FormData): Promise<Media> => {
    const response = await api.post('/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  update: async (id: number, media: UpdateMediaDto): Promise<Media> => {
    const response = await api.patch(`/media/${id}`, media);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/media/${id}`);
    return response.data;
  },
};

export default api;