import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePurchaseMedicineDto {
  @ApiPropertyOptional({ example: 10, description: 'Medicine ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  medicineId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Purchased count' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count?: number;

  @ApiPropertyOptional({ example: 3.5, description: 'Price per unit' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerOne?: number;

  @ApiPropertyOptional({ example: 17.5, description: 'Total price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @ApiPropertyOptional({ example: 2, description: 'Payment details ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentDetailsId?: number;
}
