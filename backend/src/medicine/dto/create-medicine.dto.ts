import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Amoxicillin' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({ example: 'Antibiotic' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 5, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockLimit?: number | null;

  @ApiProperty({ example: 18.75 })
  @IsNumber()
  @Min(0)
  purchasePrice: number;
}
