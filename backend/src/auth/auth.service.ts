import { Injectable, ConflictException, UnauthorizedException, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { Dentist } from '../dentist/entities/dentist.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LogWriter } from '../log-writer';
import { EmailService } from '../email/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import Redis from 'ioredis';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(Dentist)
    private readonly dentistRepository: Repository<Dentist>,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const existingUser = await this.authRepository.findUserByEmail(registerDto.gmail);
    if (existingUser) {
      this.logger.warn('Registration attempted with existing email');
      LogWriter.append('warn', AuthService.name, 'Registration attempted with existing email');
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
      // Subscription fields: new dentists get first month free
      active: true,
      created_date: new Date(),
      last_payment_date: null,
    });

    try {
      await this.emailService.sendVerificationEmail(registerDto.gmail, verificationCode);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
    }

    const { password, ...dentistWithoutPassword } = newDentist as any;
    this.logger.log(`Dentist registered with id ${dentistWithoutPassword.id}, verification email sent`);
    LogWriter.append('log', AuthService.name, `Dentist registered with id ${dentistWithoutPassword.id}, verification email sent`);
    return {
      message: 'Registration successful! Please check your email for the verification code.',
      dentist: {
        id: dentistWithoutPassword.id,
        name: dentistWithoutPassword.name,
        surname: dentistWithoutPassword.surname,
        birthDate: (dentistWithoutPassword.birthDate as Date).toISOString().slice(0, 10),
        gmail: dentistWithoutPassword.gmail,
      },
    };
  }

  async signIn(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.authRepository.findUserByEmail(loginDto.gmail);
    if (!user) {
      this.logger.warn('SignIn failed: email not found');
      LogWriter.append('warn', AuthService.name, 'SignIn failed: email not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      this.logger.warn('SignIn failed: password mismatch');
      LogWriter.append('warn', AuthService.name, 'SignIn failed: password mismatch');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      this.logger.warn(`SignIn failed: email not verified for user ${user.id}`);
      LogWriter.append('warn', AuthService.name, `SignIn failed: email not verified for user ${user.id}`);
      throw new UnauthorizedException('Please verify your email address before signing in. Check your inbox for the verification code.');
    }

    const payload = { sub: user.id, gmail: user.gmail };
    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`Dentist with id ${user.id} signed in`);
    LogWriter.append('log', AuthService.name, `Dentist with id ${user.id} signed in`);
    return { access_token, dentistId: user.id };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const user = await this.authRepository.findUserByEmail(verifyEmailDto.gmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (new Date() > user.verificationCodeExpiry) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (user.verificationCode !== verifyEmailDto.code) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.authRepository.updateUser(user.id, {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpiry: null,
    });

    this.logger.log(`Email verified for user ${user.id}`);
    LogWriter.append('log', AuthService.name, `Email verified for user ${user.id}`);
    return { message: 'Email verified successfully! You can now sign in.' };
  }

  async resendVerificationCode(resendDto: ResendVerificationDto): Promise<{ message: string }> {
    const user = await this.authRepository.findUserByEmail(resendDto.gmail);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
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
      await this.emailService.sendVerificationEmail(resendDto.gmail, verificationCode);
      this.logger.log(`Verification code resent to ${resendDto.gmail}`);
      LogWriter.append('log', AuthService.name, `Verification code resent to ${resendDto.gmail}`);
      return { message: 'Verification code has been resent to your email.' };
    } catch (error) {
      this.logger.error(`Failed to resend verification email: ${error.message}`);
      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }
  }
  async forgotPassword(email: string): Promise<{ message: string }>{
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If an account with this email exists, a reset code has been sent.' };
    }

    const floorNumberWithSixZeroes=1000000
    const hugeRangeForRandom=9000000;
    const code = Math.floor(floorNumberWithSixZeroes+ Math.random()*hugeRangeForRandom).toString();

    const secondsInMinute=60;
    const shortExpirationTimeForResetPasswordInMinutes=5;
    await this.redisClient.set(`reset:${email}`, code, 'EX', shortExpirationTimeForResetPasswordInMinutes * secondsInMinute);

    try {
      await this.emailService.sendPasswordResetEmail(email, code);
      this.logger.log(`Password reset code sent to ${email}`);
      return { message: 'If an account with this email exists, a reset code has been sent to your email.' };
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      await this.redisClient.del(`reset:${email}`);
      return { message: 'If an account with this email exists, a reset code has been sent to your email.' };
    }
  }

  async resetPassword(email: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string }> {
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const verified = await this.redisClient.get(`verified:${email}`);
    if (!verified) {
      return { success: false, message: 'Reset code not verified for this email.' };
    }

    const person = await this.dentistRepository.findOne({ where: { gmail: email } });
    if (!person) {
      return { success: false, message: 'No user found with this email.' };
    }

    const bcrypt_salt_rounds = 10;
    person.password = await bcrypt.hash(newPassword, bcrypt_salt_rounds);
    await this.dentistRepository.save(person);

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
