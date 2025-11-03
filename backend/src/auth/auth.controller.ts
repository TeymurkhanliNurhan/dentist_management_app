import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

@ApiTags('auth')
@Controller('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('Register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new dentist' })
  @ApiResponse({ status: 201, description: 'Dentist successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return await this.authService.register(registerDto);
  }

  @Post('SignIn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and retrieve JWT' })
  @ApiResponse({ status: 200, description: 'JWT token returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.signIn(loginDto);
  }
}
