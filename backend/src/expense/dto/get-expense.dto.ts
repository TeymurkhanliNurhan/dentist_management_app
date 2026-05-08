import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetExpenseDto {
  @ApiPropertyOptional({ example: 1, description: 'Expense ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: 'Electricity', description: 'Expense name contains' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 25, description: 'Recurring day of month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;
}
