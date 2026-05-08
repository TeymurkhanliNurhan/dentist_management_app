import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBlockingHoursDto {
  @ApiProperty({ example: '2026-04-15T08:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 12, description: 'Staff ID (optional)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Room ID (optional)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @ApiPropertyOptional({
    example: 'Dr. Smith',
    description: 'Display label (optional; dentists get a default from staff)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(127)
  name?: string;
}
