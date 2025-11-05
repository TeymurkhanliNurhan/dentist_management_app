import axios from 'axios';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types/auth';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
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
};

export const dentistService = {
  getById: async (id: number) => {
    const response = await api.get(`/dentist/${id}`);
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

export const patientService = {
  getAll: async (filters?: PatientFilters): Promise<Patient[]> => {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    if (filters?.surname) params.append('surname', filters.surname);
    if (filters?.birthdate) params.append('birthdate', filters.birthdate);
    
    const response = await api.get(`/patient?${params.toString()}`);
    return response.data;
  },
  create: async (patient: CreatePatientDto): Promise<Patient> => {
    const response = await api.post('/patient', patient);
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
};

export default api;

