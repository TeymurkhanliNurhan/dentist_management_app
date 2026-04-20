import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePurchaseMedicineDto {
  @ApiProperty({ example: 10, description: 'Medicine ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  medicineId: number;

  @ApiProperty({ example: 5, description: 'Purchased count' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count: number;

  @ApiProperty({ example: 3.5, description: 'Price per unit' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerOne: number;

  @ApiPropertyOptional({ example: 17.5, description: 'Total price (auto calculated when omitted)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @ApiProperty({ example: 2, description: 'Payment details ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentDetailsId: number;
}
