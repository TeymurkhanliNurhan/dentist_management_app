import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateSalaryDto {
  @ApiProperty({ example: 10, description: 'Staff ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId: number;

  @ApiPropertyOptional({ example: 2500, description: 'Fixed salary amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional({ example: 25, description: 'Salary day in month' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  salaryDay?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Treatment percent bonus for staff',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  treatmentPercentage?: number;
}
