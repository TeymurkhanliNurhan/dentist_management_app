import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, IsArray } from 'class-validator';

export class UpdateToothTreatmentDto {
    @ApiPropertyOptional({ example: 2, description: 'Treatment id' })
    @IsOptional()
    @IsInt()
    @Min(1)
    treatment_id?: number;

    @ApiPropertyOptional({ example: [11, 12], description: 'Array of tooth ids (1..52)' })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    tooth_ids?: number[];

    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string | null;
}


