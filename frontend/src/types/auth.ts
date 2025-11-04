export interface LoginRequest {
  gmail: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  dentistId: number;
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

