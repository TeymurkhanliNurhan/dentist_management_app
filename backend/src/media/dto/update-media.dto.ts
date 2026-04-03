import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class UpdateMediaDto {
    @ApiPropertyOptional({ example: 123, description: 'Photo URL as integer' })
    @IsOptional()
    @IsInt()
    photo_url?: number;

    @ApiPropertyOptional({ example: 'Updated X-ray image' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 1, description: 'Tooth Treatment ID' })
    @IsOptional()
    @IsInt()
    Tooth_Treatment_id?: number;
}