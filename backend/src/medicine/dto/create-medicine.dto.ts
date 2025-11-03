import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateMedicineDto {
    @ApiProperty({ example: 'Amoxicillin' })
    @IsString()
    @MinLength(1)
    @MaxLength(40)
    name: string;

    @ApiProperty({ example: 'Antibiotic' })
    @IsString()
    @MinLength(1)
    @MaxLength(300)
    description: string;

    @ApiProperty({ example: 25.5 })
    @IsNumber()
    @Min(0)
    price: number;
}

