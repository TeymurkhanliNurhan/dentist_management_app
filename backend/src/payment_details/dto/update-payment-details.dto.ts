import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePaymentDetailsDto {
  @ApiPropertyOptional({ example: '2026-04-20', description: 'Payment date' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 500, description: 'Payment cost' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 10, description: 'Optional expense ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expenseId?: number | null;

  @ApiPropertyOptional({ example: 22, description: 'Optional salary staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  salaryId?: number | null;
}
