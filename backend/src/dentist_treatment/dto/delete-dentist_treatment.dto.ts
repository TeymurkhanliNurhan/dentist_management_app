import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteDentistTreatmentDto {
  @ApiProperty({ example: 1, description: 'Treatment ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  treatment: number;

  @ApiProperty({ example: 1, description: 'Dentist ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dentist: number;
}
