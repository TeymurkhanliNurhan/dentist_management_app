import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TreatmentPricePer } from '../treatment-price-per.enum';

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

    @ApiPropertyOptional({ enum: TreatmentPricePer, nullable: true, example: TreatmentPricePer.TOOTH })
    @IsOptional()
    @IsEnum(TreatmentPricePer)
    pricePer?: TreatmentPricePer | null;
}


