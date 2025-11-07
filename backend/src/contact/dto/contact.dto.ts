import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ContactDto {
  @ApiProperty({ example: 'Support Request', description: 'Email subject/header' })
  @IsString()
  @IsNotEmpty()
  header: string;

  @ApiProperty({ example: 'I need help with...', description: 'Email message body' })
  @IsString()
  @IsNotEmpty()
  context: string;
}

