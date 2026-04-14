import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class GetRandevueQueryDto {
  @ApiProperty({
    example: '2026-04-05T00:00:00.000Z',
    description: 'Range start (inclusive overlap)',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    example: '2026-04-12T00:00:00.000Z',
    description: 'Range end (exclusive upper bound for overlap query)',
  })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ example: 1, description: 'Dentist id filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dentist?: number;

  @ApiPropertyOptional({ example: 2, description: 'Room id filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  room?: number;

  @ApiPropertyOptional({ example: 3, description: 'Nurse id filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nurse?: number;

  @ApiPropertyOptional({ example: 4, description: 'Patient id filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patient?: number;
}
