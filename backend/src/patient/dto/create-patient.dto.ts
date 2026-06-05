import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MinLength, IsOptional } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Jane' })
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

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  @MinLength(7)
  phone?: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
