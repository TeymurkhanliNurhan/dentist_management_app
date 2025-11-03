import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    access_token: string;

    @ApiProperty({ example: 1 })
    dentistId: number;
}


