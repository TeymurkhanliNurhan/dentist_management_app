import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseSessionItemDto {
  @ApiProperty({ example: 10, description: 'Medicine ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  medicineId: number;

  @ApiProperty({ example: 3, description: 'Purchased count' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count: number;

  @ApiProperty({
    example: 4.5,
    description: 'Purchase price per one medicine (editable)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerOne: number;
}

export class CreatePurchaseSessionDto {
  @ApiProperty({
    type: [CreatePurchaseSessionItemDto],
    description: 'Purchased medicines',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseSessionItemDto)
  items: CreatePurchaseSessionItemDto[];
}
