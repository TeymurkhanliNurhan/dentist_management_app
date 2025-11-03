import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateAppointmentDto {
    @ApiPropertyOptional({ example: '2025-11-15' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ example: '2025-11-15' })
    @IsOptional()
    @IsDateString()
    endDate?: string | null;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountFee?: number | null;
}


