import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GetStaffDto {
  @ApiPropertyOptional({ example: 1, description: 'Staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: 'Jane', description: 'Staff first name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Staff surname' })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiPropertyOptional({
    example: '1992-05-11',
    description: 'Staff birth date',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    example: 'jane.doe@clinic.com',
    description: 'Staff email',
  })
  @IsOptional()
  @IsString()
  gmail?: string;

  @ApiPropertyOptional({ example: true, description: 'Active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
