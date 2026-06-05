import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PatientRepository } from '../patient/patient.repository';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { PatientSigninDto } from './dto/patient-signin.dto';
import { PatientAuthResponseDto } from './dto/patient-auth-response.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class PatientAuthService {
  private readonly logger = new Logger(PatientAuthService.name);

  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: PatientSignupDto): Promise<PatientAuthResponseDto> {
    // Check if patient with this phone already exists in this clinic
    const existingPatient =
      await this.patientRepository.findPatientByPhoneAndClinic(
        signupDto.phone,
        signupDto.clinicId,
      );

    if (existingPatient) {
      this.logger.warn(
        `Patient signup failed: phone ${signupDto.phone} already exists in clinic ${signupDto.clinicId}`,
      );
      LogWriter.append(
        'warn',
        PatientAuthService.name,
        `Patient signup failed: phone ${signupDto.phone} already exists in clinic ${signupDto.clinicId}`,
      );
      throw new ConflictException(
        'A patient with this phone number already exists in this clinic',
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

    try {
      // Create patient with auth fields
      const patient = await this.patientRepository.createPatientWithAuth({
        name: signupDto.name,
        surname: signupDto.surname,
        phone: signupDto.phone,
        password: hashedPassword,
        clinicId: signupDto.clinicId,
      });

      // Generate JWT token
      const payload = {
        sub: patient.id,
        patientId: patient.id,
        clinicId: signupDto.clinicId,
        role: 'patient',
      };
      const access_token = await this.jwtService.signAsync(payload);

      this.logger.log(`Patient ${patient.id} signed up successfully`);
      LogWriter.append(
        'log',
        PatientAuthService.name,
        `Patient ${patient.id} signed up successfully`,
      );

      return {
        access_token,
        patientId: patient.id,
        clinicId: signupDto.clinicId,
        role: 'patient',
        patient: {
          id: patient.id,
          name: patient.name,
          surname: patient.surname,
          phone: patient.phone ?? '',
        },
      };
    } catch (error: any) {
      if (error?.message === 'Clinic not found') {
        throw new BadRequestException('Invalid clinic ID');
      }
      this.logger.error(`Patient signup failed: ${error?.message}`);
      throw new BadRequestException('Failed to create patient account');
    }
  }

  async signin(signinDto: PatientSigninDto): Promise<PatientAuthResponseDto> {
    // Find patient by exact identity (name, surname, birthDate, clinic)
    const patient = await this.patientRepository.findPatientByIdentity(
      signinDto.name,
      signinDto.surname,
      signinDto.birthDate,
      signinDto.clinicId,
    );

    if (!patient) {
      this.logger.warn(
        `Patient signin failed: no patient matches the provided identity in clinic ${signinDto.clinicId}`,
      );
      LogWriter.append(
        'warn',
        PatientAuthService.name,
        `Patient signin failed: no patient matches the provided identity in clinic ${signinDto.clinicId}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!patient.password) {
      this.logger.warn(
        `Patient signin failed: patient ${patient.id} has no password set`,
      );
      LogWriter.append(
        'warn',
        PatientAuthService.name,
        `Patient signin failed: patient ${patient.id} has no password set`,
      );
      throw new UnauthorizedException('Patient account not set up for signin');
    }

    const isPasswordMatch = await bcrypt.compare(signinDto.password, patient.password);
    if (!isPasswordMatch) {
      this.logger.warn(
        `Patient signin failed: invalid password for patient ${patient.id}`,
      );
      LogWriter.append(
        'warn',
        PatientAuthService.name,
        `Patient signin failed: invalid password for patient ${patient.id}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: patient.id,
      patientId: patient.id,
      clinicId: signinDto.clinicId,
      role: 'patient',
    };
    const access_token = await this.jwtService.signAsync(payload);

    this.logger.log(`Patient ${patient.id} signed in successfully`);
    LogWriter.append('log', PatientAuthService.name, `Patient ${patient.id} signed in successfully`);

    return {
      access_token,
      patientId: patient.id,
      clinicId: signinDto.clinicId,
      role: 'patient',
      patient: {
        id: patient.id,
        name: patient.name,
        surname: patient.surname,
        phone: patient.phone ?? '',
      },
    };
  }
}

