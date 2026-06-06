import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateClinicWhatsappDto {
  @ApiPropertyOptional({ example: true, description: 'Enable WhatsApp messaging for this clinic' })
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({
    example: '123456789012345',
    description: 'Meta WhatsApp Cloud API phone number ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsappPhoneNumberId?: string;

  @ApiPropertyOptional({
    example: '987654321098765',
    description: 'Meta WhatsApp Business account ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsappBusinessAccountId?: string;

  @ApiPropertyOptional({
    example: 'EAAxxxxxxxx',
    description: 'Meta WhatsApp Cloud API access token',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  whatsappAccessToken?: string;

  @ApiPropertyOptional({
    example: '+994706783970',
    description: 'Clinic WhatsApp display phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappDisplayPhone?: string;
}
