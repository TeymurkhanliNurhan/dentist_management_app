import { ApiProperty } from '@nestjs/swagger';

export class PatientAuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 1,
    description: 'Patient ID',
  })
  patientId: number;

  @ApiProperty({
    example: 1,
    description: 'Clinic ID',
  })
  clinicId: number;

  @ApiProperty({
    example: 'patient',
    description: 'User role',
  })
  role: string;

  @ApiProperty({
    example: { id: 1, name: 'John', surname: 'Doe', phone: '+1234567890' },
    description: 'Patient info',
  })
  patient: {
    id: number;
    name: string;
    surname: string;
    phone: string;
  };
}

