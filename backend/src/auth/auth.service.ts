import { Injectable, ConflictException, UnauthorizedException, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
}
