
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateMedicineDto {
    @ApiPropertyOptional({ example: 'Amoxicillin' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(40)
    name?: string;

    @ApiPropertyOptional({ example: 'Antibiotic' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(300)
    description?: string;

    @ApiPropertyOptional({ example: 25.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;
}

