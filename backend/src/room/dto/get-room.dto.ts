import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetRoomDto {
  @ApiPropertyOptional({ example: 1, description: 'Room ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({ example: '2', description: 'Room number/label' })
  @IsOptional()
  @IsString()
  number?: string;
}
