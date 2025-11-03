import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateToothTreatmentMedicineDto {
    @ApiProperty({ example: 3, description: 'New Medicine id' })
    @IsInt()
    @Min(1)
    medicine_id: number;
}

