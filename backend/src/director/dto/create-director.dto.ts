import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateDirectorDto {
  @ApiProperty({ example: 10, description: 'Staff ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId: number;
}
