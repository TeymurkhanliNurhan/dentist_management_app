import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class UpdateWorkingHoursDto {
  @ApiPropertyOptional({ example: 2, description: '0 (Sunday) to 6 (Saturday)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '09:30:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  startTime?: string;

  @ApiPropertyOptional({ example: '17:30:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  endTime?: string;

  @ApiPropertyOptional({ example: 12, description: 'Staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId?: number;
}
