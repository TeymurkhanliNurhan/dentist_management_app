import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({
    example: 1,
    description:
      'Clinic API context id: the authenticated dentist id, or any dentist id in the same clinic for non-dentist roles',
  })
  dentistId: number;

  @ApiProperty({ example: 14, description: 'Authenticated staff id' })
  staffId: number;

  @ApiProperty({
    example: 'director',
    enum: ['dentist', 'director', 'frontdesk', 'nurse', 'staff'],
  })
  role: 'dentist' | 'director' | 'frontdesk' | 'nurse' | 'staff';
}
