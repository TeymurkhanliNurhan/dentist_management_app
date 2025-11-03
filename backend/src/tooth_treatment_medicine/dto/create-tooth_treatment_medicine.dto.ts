import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateToothTreatmentMedicineDto {
    @ApiProperty({ example: 1, description: 'Tooth Treatment id' })
    @IsInt()
    @Min(1)
    tooth_treatment_id: number;

    @ApiProperty({ example: 2, description: 'Medicine id' })
    @IsInt()
    @Min(1)
    medicine_id: number;
}

