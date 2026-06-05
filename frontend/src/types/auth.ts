export interface LoginRequest {
  gmail: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  dentistId: number;
  staffId: number;
  role: 'dentist' | 'singleDentist' | 'director' | 'frontdesk' | 'nurse' | 'staff' | 'patient';
}

export interface PatientSigninRequest {
  name: string;
  surname: string;
  birthDate: string;
  password: string;
  clinicId: number;
}

export interface PatientSignupRequest {
  name: string;
  surname: string;
  birthDate: string;
  phone?: string;
  password: string;
  clinicId: number;
}

export interface PatientAuthResponse {
  access_token: string;
  patientId: number;
  clinicId: number;
  role: 'patient';
  patient: {
    id: number;
    name: string;
    surname: string;
    phone: string;
  };
}

export interface RegisterRequest {
  name: string;
  surname: string;
  birthDate: string;
  gmail: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  dentist: {
    id: number;
    name: string;
    surname: string;
    birthDate: string;
    gmail: string;
  };
}

