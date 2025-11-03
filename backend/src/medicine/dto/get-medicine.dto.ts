import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMedicineDto {
    @ApiPropertyOptional({ example: 1, description: 'Medicine ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ example: 'Aspirin', description: 'Medicine name' })
    @IsOptional()
    @IsString()
    name?: string;
}

