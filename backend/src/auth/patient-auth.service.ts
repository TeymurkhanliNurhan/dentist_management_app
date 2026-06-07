import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  ConflictException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { PatientRepository } from '../patient/patient.repository';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { PatientSigninDto } from './dto/patient-signin.dto';
import { PatientAuthResponseDto } from './dto/patient-auth-response.dto';
import { PatientForgotPasswordDto } from './dto/patient-forgot-password.dto';
import { PatientVerifyResetCodeDto } from './dto/patient-verify-reset-code.dto';
import { PatientResetPasswordDto } from './dto/patient-reset-password.dto';
import { WhatsappNotificationService } from '../whatsapp/whatsapp-notification.service';
import { LogWriter } from '../log-writer';

@Injectable()
export class PatientAuthService {
  private readonly logger = new Logger(PatientAuthService.name);

  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly jwtService: JwtService,
    private readonly whatsappNotifications: WhatsappNotificationService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  async signup(signupDto: PatientSignupDto): Promise<PatientAuthResponseDto> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);
    const birthDate = new Date(signupDto.birthDate);

    const existingByIdentity =
      await this.patientRepository.findPatientByIdentity(
        signupDto.name,
        signupDto.surname,
        signupDto.birthDate,
        signupDto.clinicId,
      );

    try {
      let patient: Awaited<
        ReturnType<PatientRepository['createPatientWithAuth']>
      >;

      if (existingByIdentity) {
        if (existingByIdentity.password) {
          throw new ConflictException(
            'A patient account with this identity already exists. Please sign in instead.',
          );
        }

        const activated = await this.patientRepository.activatePatientAccount(
          existingByIdentity.id,
          signupDto.clinicId,
          { phone: signupDto.phone, password: hashedPassword },
        );
        if (!activated) {
          throw new BadRequestException('Failed to activate patient account');
        }
        patient = activated;
        this.logger.log(`Patient ${patient.id} account activated via signup`);
        LogWriter.append(
          'log',
          PatientAuthService.name,
          `Patient ${patient.id} account activated via signup`,
        );
      } else {
        patient = await this.patientRepository.createPatientWithAuth({
          name: signupDto.name,
          surname: signupDto.surname,
          phone: signupDto.phone,
          password: hashedPassword,
          birthDate,
          clinicId: signupDto.clinicId,
        });
        this.logger.log(`Patient ${patient.id} signed up successfully`);
        LogWriter.append(
          'log',
          PatientAuthService.name,
          `Patient ${patient.id} signed up successfully`,
        );
      }

      const payload = {
        sub: patient.id,
        patientId: patient.id,
        clinicId: signupDto.clinicId,
        role: 'patient',
      };
      const access_token = await this.jwtService.signAsync(payload);

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
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (error?.message === 'Clinic not found') {
        throw new BadRequestException('Invalid clinic ID');
      }
      if (error?.code === '23505') {
        throw new ConflictException(
          'A patient with this name, surname, and birth date already exists in this clinic.',
        );
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

  private resetKey(patientId: number): string {
    return `patient-reset:${patientId}`;
  }

  private verifiedKey(patientId: number): string {
    return `patient-verified:${patientId}`;
  }

  private generateResetCode(): string {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  }

  async forgotPassword(
    dto: PatientForgotPasswordDto,
  ): Promise<{ message: string }> {
    const genericMessage =
      'If a matching patient account exists, a reset code has been sent to WhatsApp.';

    const patient = await this.patientRepository.findPatientByIdentity(
      dto.name,
      dto.surname,
      dto.birthDate,
      dto.clinicId,
    );

    if (!patient?.password || !patient.phone?.trim()) {
      return { message: genericMessage };
    }

    const code = this.generateResetCode();
    await this.redisClient.set(
      this.resetKey(patient.id),
      code,
      'EX',
      5 * 60,
    );

    await this.whatsappNotifications.sendPatientPasswordReset(
      dto.clinicId,
      patient.phone,
      patient.name,
      code,
    );

    this.logger.log(`Patient password reset code generated for ${patient.id}`);
    return { message: genericMessage };
  }

  async verifyResetCode(
    dto: PatientVerifyResetCodeDto,
  ): Promise<{ valid: boolean }> {
    const patient = await this.patientRepository.findPatientByIdentity(
      dto.name,
      dto.surname,
      dto.birthDate,
      dto.clinicId,
    );
    if (!patient) {
      return { valid: false };
    }

    const storedCode = await this.redisClient.get(this.resetKey(patient.id));
    if (storedCode !== dto.code) {
      return { valid: false };
    }

    await this.redisClient.set(
      this.verifiedKey(patient.id),
      'true',
      'EX',
      15 * 60,
    );
    return { valid: true };
  }

  async resetPassword(
    dto: PatientResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const patient = await this.patientRepository.findPatientByIdentity(
      dto.name,
      dto.surname,
      dto.birthDate,
      dto.clinicId,
    );
    if (!patient) {
      return { success: false, message: 'Invalid patient credentials.' };
    }

    const verified = await this.redisClient.get(this.verifiedKey(patient.id));
    if (!verified) {
      return {
        success: false,
        message: 'Reset code not verified for this patient.',
      };
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.patientRepository.updatePatientPassword(
      patient.id,
      dto.clinicId,
      hashedPassword,
    );
    if (!updated) {
      return { success: false, message: 'Failed to reset password.' };
    }

    await this.redisClient.del(this.resetKey(patient.id));
    await this.redisClient.del(this.verifiedKey(patient.id));

    this.logger.log(`Patient ${patient.id} password reset via WhatsApp flow`);
    LogWriter.append(
      'log',
      PatientAuthService.name,
      `Patient ${patient.id} password reset via WhatsApp flow`,
    );

    return { success: true, message: 'Password reset successful.' };
  }
}

