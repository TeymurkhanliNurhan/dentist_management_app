import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateBlockingHoursDto {
  @ApiPropertyOptional({ example: '2026-04-15T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-04-15T11:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 12, description: 'Staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Room ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;
}
