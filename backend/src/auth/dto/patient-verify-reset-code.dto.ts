import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { PatientForgotPasswordDto } from './patient-forgot-password.dto';

export class PatientVerifyResetCodeDto extends PatientForgotPasswordDto {
  @ApiProperty({ example: '1234567' })
  @IsString()
  @MinLength(6)
  code: string;
}
