import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectRandevueDto {
  @ApiPropertyOptional({
    description: 'Optional message from staff to the patient',
  })
  @IsOptional()
  @IsString()
  staff_response?: string;
}
