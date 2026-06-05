import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsInt, Min, IsDateString } from 'class-validator';

export class PatientSigninDto {
  @ApiProperty({ example: 'John', description: 'Patient first name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Doe', description: 'Patient last name' })
  @IsString()
  @MinLength(1)
  surname: string;

  @ApiProperty({ example: '2000-05-10', description: 'Patient birthdate' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 1, description: 'Clinic ID' })
  @IsInt()
  @Min(1)
  clinicId: number;
}

