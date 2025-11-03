import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTreatmentDto {
    @ApiProperty({ example: 'Root Canal' })
    @IsString()
    @MinLength(1)
    @MaxLength(40)
    name: string;

    @ApiProperty({ example: 500 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({ example: 'Root canal treatment procedure' })
    @IsString()
    @MinLength(1)
    @MaxLength(300)
    description: string;
}


