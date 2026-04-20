import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetPurchaseMedicineDto {
  @ApiPropertyOptional({ example: 1, description: 'Purchase medicine ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: 10, description: 'Medicine ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  medicineId?: number;

  @ApiPropertyOptional({ example: 2, description: 'Payment details ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentDetailsId?: number;
}
