import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LogWriter } from '../log-writer';
import { EmailService } from '../email/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  private formatBirthDate(birthDate: Date | string): string {
    if (birthDate instanceof Date) {
      return birthDate.toISOString().slice(0, 10);
    }
    return birthDate;
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const existingUser = await this.authRepository.findUserByEmail(
      registerDto.gmail,
    );
    if (existingUser) {
      this.logger.warn('Registration attempted with existing email');
      LogWriter.append(
        'warn',
        AuthService.name,
        'Registration attempted with existing email',
      );
      throw new ConflictException('A dentist with this email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const verificationCode = this.emailService.generateVerificationCode();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 10);

    const newDentist = await this.authRepository.createUser({
      name: registerDto.name,
      surname: registerDto.surname,
      birthDate: new Date(registerDto.birthDate),
      gmail: registerDto.gmail,
      password: hashedPassword,
      isEmailVerified: false,
      verificationCode,
      verificationCodeExpiry,
    });

    let verificationEmailSent = true;
    try {
      await this.emailService.sendVerificationEmail(
        registerDto.gmail,
        verificationCode,
      );
    } catch (error) {
      verificationEmailSent = false;
      this.logger.error(`Failed to send verification email: ${error.message}`);
    }

    const registrationLogMessage = verificationEmailSent
      ? `Dentist registered with id ${newDentist.id}, verification email sent`
      : `Dentist registered with id ${newDentist.id}, but verification email failed`;
    this.logger.log(registrationLogMessage);
    LogWriter.append(
      'log',
      AuthService.name,
      registrationLogMessage,
    );
    return {
      message:
        'Registration successful! Please check your email for the verification code.',
      dentist: {
        id: newDentist.id,
        name: newDentist.staff.name,
        surname: newDentist.staff.surname,
        birthDate: this.formatBirthDate(newDentist.staff.birthDate),
        gmail: newDentist.staff.gmail,
      },
    };
  }

  async signIn(loginDto: LoginDto): Promise<LoginResponseDto> {
    const staff = await this.authRepository.findStaffAuthByEmail(loginDto.gmail);
    if (!staff) {
      this.logger.warn('SignIn failed: email not found');
      LogWriter.append(
        'warn',
        AuthService.name,
        'SignIn failed: email not found',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, staff.password);
    if (!isMatch) {
      this.logger.warn('SignIn failed: password mismatch');
      LogWriter.append(
        'warn',
        AuthService.name,
        'SignIn failed: password mismatch',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!staff.isEmailVerified) {
      this.logger.warn(`SignIn failed: email not verified for staff ${staff.id}`);
      LogWriter.append(
        'warn',
        AuthService.name,
        `SignIn failed: email not verified for staff ${staff.id}`,
      );
      throw new UnauthorizedException(
        'Please verify your email address before signing in. Check your inbox for the verification code.',
      );
    }

    const ownDentistId = staff.dentist?.id;
    const role = staff.dentist
      ? 'dentist'
      : staff.director
        ? 'director'
        : staff.frontDeskWorker
          ? 'frontdesk'
          : staff.nurse
            ? 'nurse'
            : 'staff';

    const contextDentistId =
      ownDentistId ??
      (await this.authRepository.findAnyDentistIdInClinic(staff.clinicId));
    if (!contextDentistId) {
      throw new UnauthorizedException(
        'Clinic has no dentist account; cannot establish API context',
      );
    }

    const payload = {
      sub: contextDentistId,
      gmail: staff.gmail,
      staffId: staff.id,
      role,
    };
    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`Staff with id ${staff.id} signed in as ${role}`);
    LogWriter.append(
      'log',
      AuthService.name,
      `Staff with id ${staff.id} signed in as ${role}`,
    );
    return {
      access_token,
      dentistId: contextDentistId,
      staffId: staff.id,
      role,
    };
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.authRepository.findUserByEmail(
      verifyEmailDto.gmail,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.staff.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.staff.verificationCode || !user.staff.verificationCodeExpiry) {
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    if (new Date() > user.staff.verificationCodeExpiry) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    if (user.staff.verificationCode !== verifyEmailDto.code) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.authRepository.updateUser(user.id, {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpiry: null,
    });

    this.logger.log(`Email verified for user ${user.id}`);
    LogWriter.append(
      'log',
      AuthService.name,
      `Email verified for user ${user.id}`,
    );
    return { message: 'Email verified successfully! You can now sign in.' };
  }

  async resendVerificationCode(
    resendDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const user = await this.authRepository.findUserByEmail(resendDto.gmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.staff.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationCode = this.emailService.generateVerificationCode();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 10);

    await this.authRepository.updateUser(user.id, {
      verificationCode,
      verificationCodeExpiry,
    });

    try {
      await this.emailService.sendVerificationEmail(
        resendDto.gmail,
        verificationCode,
      );
      this.logger.log(`Verification code resent to ${resendDto.gmail}`);
      LogWriter.append(
        'log',
        AuthService.name,
        `Verification code resent to ${resendDto.gmail}`,
      );
      return { message: 'Verification code has been resent to your email.' };
    } catch (error) {
      this.logger.error(
        `Failed to resend verification email: ${error.message}`,
      );
      throw new BadRequestException(
        'Failed to send verification email. Please try again later.',
      );
    }
  }
  async forgotPassword(
    email: string,
  ): Promise<{ message: string; code?: string }> {
    const genericResetMessage =
      'If an account with this email exists, a reset code has been sent.';
    const floorNumberWithSixZeroes = 1000000;
    const hugeRangeForRandom = 9000000;
    const code = Math.floor(
      floorNumberWithSixZeroes + Math.random() * hugeRangeForRandom,
    ).toString();

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return {
        message: genericResetMessage,
        code,
      };
    }

    const secondsInMinute = 60;
    const shortExpirationTimeForResetPasswordInMinutes = 5;
    await this.redisClient.set(
      `reset:${email}`,
      code,
      'EX',
      shortExpirationTimeForResetPasswordInMinutes * secondsInMinute,
    );

    try {
      await this.emailService.sendPasswordResetEmail(email, code);
      this.logger.log(`Password reset code sent to ${email}`);
      return {
        message: genericResetMessage,
        code,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error.message}`,
      );
      return {
        message: genericResetMessage,
        code,
      };
    }
  }

  async resetPassword(
    email: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const verified = await this.redisClient.get(`verified:${email}`);
    if (!verified) {
      return {
        success: false,
        message: 'Reset code not verified for this email.',
      };
    }

    const person = await this.authRepository.findUserByEmail(email);
    if (!person) {
      return { success: false, message: 'No user found with this email.' };
    }

    const bcrypt_salt_rounds = 10;
    await this.authRepository.updateUser(person.id, {
      password: await bcrypt.hash(newPassword, bcrypt_salt_rounds),
    });

    await this.redisClient.del(`reset:${email}`);
    await this.redisClient.del(`verified:${email}`);

    this.logger.log(`Password reset for ${email}`);
    return { success: true, message: 'Password reset successful.' };
  }

  async verifyResetCode(email: string, code: string): Promise<boolean> {
    const storedCode = await this.redisClient.get(`reset:${email}`);
    if (storedCode !== code) return false;

    await this.redisClient.set(`verified:${email}`, 'true', 'EX', 15 * 60);
    return true;
  }
}
