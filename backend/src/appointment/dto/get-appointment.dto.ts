import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAppointmentDto {
    @ApiPropertyOptional({ example: 1, description: 'Appointment ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ example: '2025-01-01', description: 'Start date' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ example: '2025-12-31', description: 'End date' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ example: 1, description: 'Patient ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    patient?: number;
}

