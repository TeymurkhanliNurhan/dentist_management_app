import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateToothTreatmentDto {
    @ApiPropertyOptional({ example: 1, description: 'Appointment id' })
    @IsOptional()
    @IsInt()
    @Min(1)
    appointment_id?: number;

    @ApiPropertyOptional({ example: 2, description: 'Treatment id' })
    @IsOptional()
    @IsInt()
    @Min(1)
    treatment_id?: number;

    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string | null;
}

export class UpdateToothTreatmentDto {}


