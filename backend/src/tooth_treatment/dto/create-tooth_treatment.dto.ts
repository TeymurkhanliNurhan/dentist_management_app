import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsArray,
} from 'class-validator';

export class CreateToothTreatmentDto {
  @ApiProperty({ example: 1, description: 'Dentist id' })
  @IsInt()
  @Min(1)
  dentist_id: number;

  @ApiProperty({ example: 1, description: 'Appointment id' })
  @IsInt()
  @Min(1)
  appointment_id: number;

  @ApiProperty({ example: 2, description: 'Treatment id' })
  @IsInt()
  @Min(1)
  treatment_id: number;

  @ApiProperty({ example: 3, description: 'Patient id' })
  @IsInt()
  @Min(1)
  patient_id: number;

  @ApiProperty({ example: [11, 12], description: 'Array of tooth ids (1..52)' })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tooth_ids: number[];

  @ApiPropertyOptional({ example: 'Caries removal and filling' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
