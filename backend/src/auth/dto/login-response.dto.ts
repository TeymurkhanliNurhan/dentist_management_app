import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 1, description: 'Dentist id for dentist accounts' })
  dentistId: number;

  @ApiProperty({ example: 14, description: 'Authenticated staff id' })
  staffId: number;

  @ApiProperty({
    example: 'director',
    enum: ['dentist', 'director', 'frontdesk', 'nurse', 'staff'],
  })
  role: 'dentist' | 'director' | 'frontdesk' | 'nurse' | 'staff';
}
