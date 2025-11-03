import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { Dentist } from '../dentist/entities/dentist.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // Check if user already exists
    const existingUser = await this.authRepository.findUserByEmail(registerDto.gmail);
    if (existingUser) {
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

    const payload = { sub: newDentist.id, gmail: newDentist.gmail };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token, dentistId: newDentist.id };
  }

  async signIn(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.authRepository.findUserByEmail(loginDto.gmail);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, gmail: user.gmail };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token, dentistId: user.id };
  }
}
