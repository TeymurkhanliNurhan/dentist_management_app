import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { Dentist } from '../dentist/entities/dentist.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LogWriter } from '../logs/log-writer';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(registerDto.gmail);
    if (existingUser) {
      this.logger.warn('Registration attempted with existing email');
      LogWriter.append('warn', AuthService.name, 'Registration attempted with existing email');
      throw new ConflictException('A dentist with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create new dentist
    const newDentist = await this.authRepository.createUser({
      name: registerDto.name,
      surname: registerDto.surname,
      birthDate: new Date(registerDto.birthDate),
      gmail: registerDto.gmail,
      password: hashedPassword,
    });

    const { password, ...dentistWithoutPassword } = newDentist as any;
    this.logger.log(`Dentist registered with id ${dentistWithoutPassword.id}`);
    LogWriter.append('log', AuthService.name, `Dentist registered with id ${dentistWithoutPassword.id}`);
    return {
      message: 'Dentist registered successfully',
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

    const payload = { sub: user.id, gmail: user.gmail };
    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`Dentist with id ${user.id} signed in`);
    LogWriter.append('log', AuthService.name, `Dentist with id ${user.id} signed in`);
    return { access_token, dentistId: user.id };
  }
}
