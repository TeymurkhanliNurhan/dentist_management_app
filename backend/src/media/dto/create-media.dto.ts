import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMediaDto {
    @ApiProperty({ example: 'X-ray image' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Description of the media' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 1, description: 'Tooth Treatment ID' })
    @Type(() => Number)
    @IsInt()
    tooth_treatment_id: number;
}