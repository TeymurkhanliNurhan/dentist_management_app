import { authService } from '../api';
import axios from 'axios';

// Mock axios module
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    create: jest.fn(() => ({
      ...actualAxios.create(),
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
      },
    })),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('login', () => {
    it('should successfully login and return access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-token',
          dentistId: 1,
        },
      };

      const axiosInstance = axios.create();
      (axios.create as jest.Mock).mockReturnValue(axiosInstance);
      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const credentials = {
        gmail: 'test@example.com',
        password: 'password123',
      };

      const result = await authService.login(credentials);

      expect(result).toEqual(mockResponse.data);
      expect(axiosInstance.post).toHaveBeenCalledWith('/Auth/SignIn', credentials);
    });

    it('should throw error on failed login', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      };

      const axiosInstance = axios.create();
      (axios.create as jest.Mock).mockReturnValue(axiosInstance);
      (axiosInstance.post as jest.Mock).mockRejectedValueOnce(errorResponse);

      const credentials = {
        gmail: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(authService.login(credentials)).rejects.toEqual(errorResponse);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockResponse = {
        data: {
          message: 'Registration successful',
          dentistId: 1,
        },
      };

      const axiosInstance = axios.create();
      (axios.create as jest.Mock).mockReturnValue(axiosInstance);
      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const registerData = {
        name: 'John',
        surname: 'Doe',
        birthDate: '1990-01-01',
        gmail: 'john@example.com',
        password: 'password123',
      };

      const result = await authService.register(registerData);

      expect(result).toEqual(mockResponse.data);
      expect(axiosInstance.post).toHaveBeenCalledWith('/Auth/Register', registerData);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with correct code', async () => {
      const mockResponse = {
        data: {
          message: 'Email verified successfully',
        },
      };

      const axiosInstance = axios.create();
      (axios.create as jest.Mock).mockReturnValue(axiosInstance);
      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authService.verifyEmail('test@example.com', '123456');

      expect(result).toEqual(mockResponse.data);
      expect(axiosInstance.post).toHaveBeenCalledWith('/Auth/VerifyEmail', {
        gmail: 'test@example.com',
        code: '123456',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset code', async () => {
      const mockResponse = {
        data: {
          message: 'Password reset code sent',
        },
      };

      const axiosInstance = axios.create();
      (axios.create as jest.Mock).mockReturnValue(axiosInstance);
      (axiosInstance.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await authService.forgotPassword('test@example.com');

      expect(result).toEqual(mockResponse.data);
      expect(axiosInstance.post).toHaveBeenCalledWith('/Auth/password-reset/code-request', {
        email: 'test@example.com',
      });
    });
  });
});

