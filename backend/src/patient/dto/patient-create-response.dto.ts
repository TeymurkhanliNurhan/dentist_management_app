import { ApiProperty } from '@nestjs/swagger';

class ClinicRefDto {
  @ApiProperty({ example: 1 })
  id: number;
}

export class PatientCreateResponseDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'patient3' })
  name: string;

  @ApiProperty({ example: 'Doe' })
  surname: string;

  @ApiProperty({ example: '2000-05-10' })
  birthDate: string;

  @ApiProperty({ type: ClinicRefDto })
  clinic: ClinicRefDto;
}
