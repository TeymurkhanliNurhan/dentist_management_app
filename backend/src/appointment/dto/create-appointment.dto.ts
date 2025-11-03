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

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountFee?: number;
}


