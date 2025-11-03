import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreatePatientDto {
    @ApiProperty({ example: 'Jane' })
    @IsString()
    @MinLength(1)
    name: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(1)
    surname: string;

    @ApiProperty({ example: '2000-05-10' })
    @IsDateString()
    birthDate: string;
}


