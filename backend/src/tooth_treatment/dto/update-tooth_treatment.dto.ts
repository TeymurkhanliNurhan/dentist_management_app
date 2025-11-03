import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateToothTreatmentDto {
    @ApiPropertyOptional({ example: 2, description: 'Treatment id' })
    @IsOptional()
    @IsInt()
    @Min(1)
    treatment_id?: number;

    @ApiPropertyOptional({ example: 11, description: 'Tooth id (1..52)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    tooth_id?: number;

    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string | null;
}


