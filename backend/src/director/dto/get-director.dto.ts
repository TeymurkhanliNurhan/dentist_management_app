import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetDirectorDto {
  @ApiPropertyOptional({ example: 1, description: 'Director ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: 10, description: 'Staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId?: number;
}
