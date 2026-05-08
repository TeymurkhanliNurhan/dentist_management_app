import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: '3', description: 'Room number/label' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  number?: string;

  @ApiPropertyOptional({ example: 'X-ray room' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;
}
