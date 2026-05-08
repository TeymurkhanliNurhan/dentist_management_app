import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateDentistDto {
  @ApiProperty({
    example: 5,
    description: 'Existing staff ID to link as dentist',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId: number;
}
