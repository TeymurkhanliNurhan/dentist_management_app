import { ApiProperty } from '@nestjs/swagger';

class DentistSafeDto {
    @ApiProperty({ example: 4 })
    id: number;

    @ApiProperty({ example: 'John' })
    name: string;

    @ApiProperty({ example: 'Doe' })
    surname: string;

    @ApiProperty({ example: '1990-01-01' })
    birthDate: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    gmail: string;
}

export class RegisterResponseDto {
    @ApiProperty({ example: 'Dentist registered successfully' })
    message: string;

    @ApiProperty({ type: DentistSafeDto })
    dentist: DentistSafeDto;
}


