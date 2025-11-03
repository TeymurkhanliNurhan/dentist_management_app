import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetToothTreatmentMedicineDto {
    @ApiPropertyOptional({ example: 1, description: 'Medicine ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    medicine?: number;

    @ApiPropertyOptional({ example: 1, description: 'Tooth Treatment ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    tooth_treatment?: number;
}

