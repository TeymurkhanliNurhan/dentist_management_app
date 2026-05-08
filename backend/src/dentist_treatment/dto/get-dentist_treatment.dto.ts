import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDentistTreatmentDto {
  @ApiPropertyOptional({ example: 1, description: 'Treatment ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  treatment?: number;

  @ApiPropertyOptional({ example: 1, description: 'Dentist ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dentist?: number;
}
