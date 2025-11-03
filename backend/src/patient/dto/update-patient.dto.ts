import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePatientDto {
    @ApiPropertyOptional({ example: 'Jane' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    name?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    surname?: string;

    @ApiPropertyOptional({ example: '2000-05-10' })
    @IsOptional()
    @IsDateString()
    birthDate?: string;
}


