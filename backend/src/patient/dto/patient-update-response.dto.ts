import { ApiProperty } from '@nestjs/swagger';

export class PatientUpdateResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Jane' })
  name: string;

  @ApiProperty({ example: 'Doe' })
  surname: string;

  @ApiProperty({ example: '2000-05-10' })
  birthDate: string;

  @ApiProperty({ example: '+994501234567', nullable: true })
  number: string | null;
}
