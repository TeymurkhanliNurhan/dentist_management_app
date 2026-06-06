import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClinicWhatsappResponseDto {
  @ApiProperty({ example: 1 })
  clinicId: number;

  @ApiProperty({ example: true })
  whatsappEnabled: boolean;

  @ApiPropertyOptional({ example: '123456789012345', nullable: true })
  whatsappPhoneNumberId: string | null;

  @ApiPropertyOptional({ example: '987654321098765', nullable: true })
  whatsappBusinessAccountId: string | null;

  @ApiPropertyOptional({ example: '+994706783970', nullable: true })
  whatsappDisplayPhone: string | null;

  @ApiProperty({ example: true })
  accessTokenConfigured: boolean;

  @ApiPropertyOptional({ example: '****abcd', nullable: true })
  accessTokenMasked: string | null;
}
