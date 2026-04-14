import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetDentistDto {
  @ApiPropertyOptional({ example: 1, description: 'Dentist ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: 'John', description: 'Dentist first name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Dentist surname' })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiPropertyOptional({
    example: '1990-01-01',
    description: 'Dentist birth date',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    example: 'john.doe@clinic.com',
    description: 'Dentist email',
  })
  @IsOptional()
  @IsString()
  gmail?: string;
}
