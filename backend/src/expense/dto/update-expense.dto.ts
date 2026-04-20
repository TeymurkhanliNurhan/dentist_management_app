import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 'Electricity Bill', description: 'Expense name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Monthly utility expense' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 500, description: 'Recurring fixed cost' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fixedCost?: number | null;

  @ApiPropertyOptional({ example: 25, description: 'Day of month for recurring payment' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number | null;
}
