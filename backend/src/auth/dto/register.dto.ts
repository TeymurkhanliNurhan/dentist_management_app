import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsDateString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John', description: 'Dentist first name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Doe', description: 'Dentist last name' })
  @IsString()
  @MinLength(1)
  surname: string;

  @ApiProperty({ example: '1990-01-01', description: 'Birth date' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsEmail()
  gmail: string;

  @ApiProperty({ example: 'password123', description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;
}

