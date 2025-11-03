import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPatientToothDto {
    @ApiProperty({ example: 1, description: 'Patient ID' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    patient: number;

    @ApiPropertyOptional({ example: 1, description: 'Tooth ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    tooth?: number;
}

