import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class GetPaymentDetailsDto {
  @ApiPropertyOptional({ example: 1, description: 'Payment details ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: '2026-04-20', description: 'Payment date' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: '2026-04-19', description: 'Payment date from (inclusive), range' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-25', description: 'Payment date to (inclusive), range' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 10, description: 'Expense ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expenseId?: number;

  @ApiPropertyOptional({ example: 22, description: 'Salary staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  salaryId?: number;
}
