import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

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
}
