import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateFrontDeskWorkerDto {
  @ApiProperty({ example: 12, description: 'Staff ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  staffId: number;
}
