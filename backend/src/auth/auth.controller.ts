import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Logger } from '@nestjs/common';
import { LogWriter } from '../log-writer';

@ApiTags('auth')
@Controller('Auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Post('Register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new dentist' })
  @ApiResponse({ status: 201, description: 'Dentist successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    this.logger.log('Register endpoint called');
    LogWriter.append('log', AuthController.name, 'Register endpoint called');
    return await this.authService.register(registerDto);
  }

  @Post('SignIn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and retrieve JWT' })
  @ApiResponse({ status: 200, description: 'JWT token returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or email not verified' })
  async signIn(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.log('SignIn endpoint called');
    LogWriter.append('log', AuthController.name, 'SignIn endpoint called');
    return await this.authService.signIn(loginDto);
  }

  @Post('VerifyEmail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with verification code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code, expired code, or email already verified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    this.logger.log('VerifyEmail endpoint called');
    LogWriter.append('log', AuthController.name, 'VerifyEmail endpoint called');
    return await this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('ResendVerificationCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification code to email' })
  @ApiResponse({ status: 200, description: 'Verification code resent' })
  @ApiResponse({ status: 400, description: 'Email already verified or failed to send email' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerificationCode(@Body() resendDto: ResendVerificationDto): Promise<{ message: string }> {
    this.logger.log('ResendVerificationCode endpoint called');
    LogWriter.append('log', AuthController.name, 'ResendVerificationCode endpoint called');
    return await this.authService.resendVerificationCode(resendDto);
  }
}
