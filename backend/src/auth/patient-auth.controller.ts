import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PatientAuthService } from './patient-auth.service';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { PatientSigninDto } from './dto/patient-signin.dto';
import { PatientAuthResponseDto } from './dto/patient-auth-response.dto';
import { LogWriter } from '../log-writer';
import { Logger } from '@nestjs/common';

@ApiTags('patient-auth')
@Controller('patient-auth')
export class PatientAuthController {
  private readonly logger = new Logger(PatientAuthController.name);

  constructor(private readonly patientAuthService: PatientAuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Patient signup' })
  @ApiResponse({
    status: 201,
    description: 'Patient successfully signed up',
    type: PatientAuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async signup(
    @Body() signupDto: PatientSignupDto,
  ): Promise<PatientAuthResponseDto> {
    this.logger.log('Patient signup endpoint called');
    LogWriter.append(
      'log',
      PatientAuthController.name,
      'Patient signup endpoint called',
    );
    return await this.patientAuthService.signup(signupDto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Patient signin' })
  @ApiResponse({
    status: 200,
    description: 'Patient successfully signed in',
    type: PatientAuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async signin(
    @Body() signinDto: PatientSigninDto,
  ): Promise<PatientAuthResponseDto> {
    this.logger.log('Patient signin endpoint called');
    LogWriter.append(
      'log',
      PatientAuthController.name,
      'Patient signin endpoint called',
    );
    return await this.patientAuthService.signin(signinDto);
  }
}

