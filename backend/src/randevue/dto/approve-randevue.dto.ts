import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ApproveRandevueDto {
  @ApiPropertyOptional({
    description:
      'Clinic room to assign; defaults to the general dentistry room when omitted',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  room_id?: number;

  @ApiPropertyOptional({ description: 'Optional nurse for the confirmed randevue' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nurse_id?: number;

  @ApiPropertyOptional({
    description: 'Optional message from staff to the patient',
  })
  @IsOptional()
  @IsString()
  staff_response?: string;
}
