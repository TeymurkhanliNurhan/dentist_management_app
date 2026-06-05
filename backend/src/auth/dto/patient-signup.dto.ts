import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsPhoneNumber, IsInt, Min, IsDateString } from 'class-validator';

export class PatientSignupDto {
  @ApiProperty({ example: 'John', description: 'Patient first name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Doe', description: 'Patient last name' })
  @IsString()
  @MinLength(1)
  surname: string;

  @ApiProperty({ example: 1, description: 'Clinic ID' })
  @IsInt()
  @Min(1)
  clinicId: number;

  @ApiProperty({ example: '2000-05-10', description: 'Birth date' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
  })
  @IsString()
  @MinLength(7)
  phone: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}


