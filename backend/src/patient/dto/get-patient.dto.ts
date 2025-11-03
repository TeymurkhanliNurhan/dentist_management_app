import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPatientDto {
    @ApiPropertyOptional({ example: 1, description: 'Patient ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ example: 'Jane', description: 'Patient name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Doe', description: 'Patient surname' })
    @IsOptional()
    @IsString()
    surname?: string;

    @ApiPropertyOptional({ example: '2000-05-10', description: 'Patient birthdate' })
    @IsOptional()
    @IsDateString()
    birthdate?: string;
}

