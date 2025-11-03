import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

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

    @ApiPropertyOptional({ example: 1, description: 'Dentist id' })
    @IsOptional()
    @IsInt()
    dentist?: number;
}


