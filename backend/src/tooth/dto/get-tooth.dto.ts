import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean, IsIn, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetToothDto {
    @ApiPropertyOptional({ example: 1, description: 'Tooth ID' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number;

    @ApiPropertyOptional({ example: 1, description: 'Tooth number' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    number?: number;

    @ApiPropertyOptional({ example: true, description: 'Is permanent tooth' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    permanent?: boolean;

    @ApiPropertyOptional({ example: true, description: 'Is upper jaw' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    upperJaw?: boolean;

    @ApiProperty({ 
        example: 'english', 
        description: 'Language for tooth name translation',
        enum: ['english', 'azerbaijani', 'russian']
    })
    @IsString()
    @IsIn(['english', 'azerbaijani', 'russian'])
    language: string;
}

