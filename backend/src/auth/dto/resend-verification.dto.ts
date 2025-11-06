import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @IsEmail()
  gmail: string;
}

