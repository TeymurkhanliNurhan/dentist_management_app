import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Matches, Max, Min } from 'class-validator';

export class CreateWorkingHoursDto {
  @ApiProperty({ example: 1, description: '0 (Sunday) to 6 (Saturday)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00:00', description: 'Start time in HH:mm:ss' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  startTime: string;

  @ApiProperty({ example: '17:00:00', description: 'End time in HH:mm:ss' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  endTime: string;

  @ApiProperty({ example: 12, description: 'Staff ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId: number;
}
