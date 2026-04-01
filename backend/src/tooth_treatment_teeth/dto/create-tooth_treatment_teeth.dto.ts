import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsArray } from 'class-validator';

export class CreateToothTreatmentTeethDto {
    @ApiProperty({ example: 1, description: 'Tooth Treatment id' })
    @IsInt()
    @Min(1)
    tooth_treatment_id: number;

    @ApiProperty({ example: [11, 12], description: 'Array of tooth ids to link (1..52)' })
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    tooth_ids: number[];

    @ApiProperty({ example: 3, description: 'Patient id' })
    @IsInt()
    @Min(1)
    patient_id: number;
}
