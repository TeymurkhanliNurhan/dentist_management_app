import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateToothTreatmentDto {
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

    @ApiProperty({ example: 11, description: 'Tooth id (1..52)' })
    @IsInt()
    @Min(1)
    tooth_id: number;

    @ApiPropertyOptional({ example: 'Caries removal and filling' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string;
}

export class CreateToothTreatmentDto {}


