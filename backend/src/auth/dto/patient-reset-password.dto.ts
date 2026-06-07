import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class PatientResetPasswordDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  surname: string;

  @ApiProperty({ example: '2000-05-10' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  clinicId: number;

  @ApiProperty({ example: 'new1234' })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'new1234' })
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
