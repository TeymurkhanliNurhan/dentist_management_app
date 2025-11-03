import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTreatmentDto {
    @ApiPropertyOptional({ example: 1, description: 'Treatment ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ example: 'Cleaning', description: 'Treatment name' })
    @IsOptional()
    @IsString()
    name?: string;
}

