import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateMediaDto {
    @ApiProperty({ example: 123, description: 'Photo URL as integer' })
    @IsInt()
    photo_url: number;

    @ApiProperty({ example: 'X-ray image' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Description of the media' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 1, description: 'Tooth Treatment ID' })
    @IsInt()
    Tooth_Treatment_id: number;
}