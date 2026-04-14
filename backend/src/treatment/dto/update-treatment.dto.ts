import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TreatmentPricePer } from '../treatment-price-per.enum';

export class UpdateTreatmentDto {
  @ApiPropertyOptional({ example: 'Root Canal' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'Root canal treatment procedure' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ enum: TreatmentPricePer, nullable: true })
  @IsOptional()
  @IsEnum(TreatmentPricePer)
  pricePer?: TreatmentPricePer | null;
}
