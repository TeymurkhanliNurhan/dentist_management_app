import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateAppointmentDto {
    @ApiProperty({ example: '2025-11-15' })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({ example: '2025-11-15' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ example: 500, description: 'Amount charged by the dentist' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    chargedFee?: number;

    @ApiProperty({ example: 3, description: 'Patient id' })
    @IsNumber()
    @Min(1)
    patient_id: number;
}
