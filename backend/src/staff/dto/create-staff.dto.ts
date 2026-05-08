import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  surname: string;

  @ApiProperty({ example: '1992-05-11' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 'jane.doe@clinic.com' })
  @IsEmail()
  gmail: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
