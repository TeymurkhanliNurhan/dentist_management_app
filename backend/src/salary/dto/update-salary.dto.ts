import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSalaryDto {
  @ApiPropertyOptional({ example: 2500, description: 'Fixed salary amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number | null;

  @ApiPropertyOptional({ example: 25, description: 'Salary day in month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  salaryDay?: number | null;

  @ApiPropertyOptional({
    example: 10,
    description: 'Treatment percent bonus for staff',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  treatmentPercentage?: number | null;
}
