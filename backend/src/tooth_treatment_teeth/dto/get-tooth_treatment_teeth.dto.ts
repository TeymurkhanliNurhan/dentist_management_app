import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetToothTreatmentTeethDto {
  @ApiPropertyOptional({ example: 1, description: 'Tooth Treatment Teeth ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Tooth Treatment ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tooth_treatment_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Tooth ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tooth_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Patient ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient_id?: number;
}
