import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: '2', description: 'Room number/label' })
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  number: string;

  @ApiProperty({ example: 'Main treatment room' })
  @IsString()
  @MinLength(1)
  description: string;
}
