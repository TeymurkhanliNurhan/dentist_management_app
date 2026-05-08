import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateToothTreatmentMedicineDto {
  @ApiProperty({
    example: 3,
    description: 'New quantity for the selected medicine',
  })
  @IsInt()
  @Min(1)
  quantity: number;
}
