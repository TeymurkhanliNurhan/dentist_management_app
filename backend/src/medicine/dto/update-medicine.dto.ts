import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMedicineDto {
  @ApiPropertyOptional({ example: 1, description: 'Clinic id' })
  @IsOptional()
  @IsInt()
  @Min(1)
  clinic_id?: number;

  @ApiPropertyOptional({ example: 'Amoxicillin' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional({ example: 'Antibiotic' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: 25.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockLimit?: number | null;

  @ApiPropertyOptional({ example: 18.75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;
}
