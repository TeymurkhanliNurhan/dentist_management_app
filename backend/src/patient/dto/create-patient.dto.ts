import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 1, description: 'Clinic id' })
  @IsInt()
  @Min(1)
  clinic_id: number;

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
