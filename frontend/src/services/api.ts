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

export default api;

