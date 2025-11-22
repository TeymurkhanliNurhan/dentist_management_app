import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { EmailService } from '../../email/email.service';
import { Dentist } from '../../dentist/entities/dentist.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let dentistRepository: jest.Mocked<Repository<Dentist>>;
  let redisClient: any;

  const mockAuthRepository = {
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    findUserById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    generateVerificationCode: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetCode: jest.fn(),
  };

  const mockDentistRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockRedisClient = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: mockAuthRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: getRepositoryToken(Dentist),
          useValue: mockDentistRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
    emailService = module.get(EmailService);
    dentistRepository = module.get(getRepositoryToken(Dentist));
    redisClient = module.get('REDIS_CLIENT');

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'John',
      surname: 'Doe',
      birthDate: '1990-01-01',
      gmail: 'john@example.com',
      password: 'password123',
    };

    it('should throw ConflictException if user already exists', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce({
        id: 1,
        gmail: 'john@example.com',
      } as Dentist);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(registerDto.gmail);
    });

    it('should successfully register a new user', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce(null);
      mockedBcrypt.hash.mockResolvedValueOnce('hashedPassword' as never);
      mockEmailService.generateVerificationCode.mockReturnValueOnce('123456');
      mockEmailService.sendVerificationEmail.mockResolvedValueOnce(undefined);
      
      const mockDentist = {
        id: 1,
        name: registerDto.name,
        surname: registerDto.surname,
        birthDate: new Date(registerDto.birthDate),
        gmail: registerDto.gmail,
        password: 'hashedPassword',
        isEmailVerified: false,
      } as Dentist;

      mockAuthRepository.createUser.mockResolvedValueOnce(mockDentist);

      const result = await service.register(registerDto);

      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(registerDto.gmail);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockEmailService.generateVerificationCode).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mockAuthRepository.createUser).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('signIn', () => {
    const loginDto: LoginDto = {
      gmail: 'john@example.com',
      password: 'password123',
    };

    const mockDentist = {
      id: 1,
      name: 'John',
      surname: 'Doe',
      gmail: 'john@example.com',
      password: 'hashedPassword',
      isEmailVerified: true,
    } as Dentist;

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce(null);

      await expect(service.signIn(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(loginDto.gmail);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce(mockDentist);
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      await expect(service.signIn(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockDentist.password);
    });

    it('should successfully login and return access token', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValueOnce(mockDentist);
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);
      mockJwtService.signAsync = jest.fn().mockResolvedValueOnce('mock-jwt-token');

      const result = await service.signIn(loginDto);

      expect(mockAuthRepository.findUserByEmail).toHaveBeenCalledWith(loginDto.gmail);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockDentist.password);
      expect(mockJwtService.signAsync).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
    });
  });
});




