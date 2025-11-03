import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetToothTreatmentDto {
    @ApiPropertyOptional({ example: 1, description: 'Tooth Treatment ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ example: 1, description: 'Appointment ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    appointment?: number;

    @ApiPropertyOptional({ example: 1, description: 'Tooth ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    tooth?: number;

    @ApiPropertyOptional({ example: 1, description: 'Patient ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    patient?: number;

    @ApiPropertyOptional({ example: 1, description: 'Treatment ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    treatment?: number;
}

