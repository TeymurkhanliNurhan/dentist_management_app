import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateNurseDto {
  @ApiProperty({ example: 15, description: 'Staff ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId: number;
}
