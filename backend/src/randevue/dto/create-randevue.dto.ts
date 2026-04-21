import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateRandevueDto {
  @ApiProperty({ example: '2026-04-07T09:00:00.000Z' })
  @IsDateString()
  startDateTime: string;

  @ApiProperty({ example: '2026-04-07T10:00:00.000Z' })
  @IsDateString()
  endDateTime: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  patient_id: number;

  @ApiPropertyOptional({ example: 1, description: 'Dentist id' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  dentist_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Link to an open appointment (no end date)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  appointment_id?: number;

  @ApiPropertyOptional({
    description: 'Create a new open appointment and link this randevue',
  })
  @IsOptional()
  @IsBoolean()
  create_new_appointment?: boolean;

  @ApiPropertyOptional({
    example: '2026-04-07',
    description:
      'Appointment start date (YYYY-MM-DD); required when create_new_appointment is true',
  })
  @ValidateIf((o) => o.create_new_appointment === true)
  @IsDateString()
  appointment_start_date?: string;

  @ApiPropertyOptional({
    description:
      'Clinic room; defaults to the general dentistry room for the patient clinic',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  room_id?: number;

  @ApiPropertyOptional({
    description: 'Nurse from the same clinic as the patient (optional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nurse_id?: number;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Tooth treatment ids from this appointment; each treatment tooth row will be linked to the created randevue',
    example: [12, 15],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  tooth_treatment_ids?: number[];
}
