import {ApiProperty} from "@nestjs/swagger";
import {IsEmail, IsString, MinLength} from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'new1234' })
    @IsString()
    @MinLength(6)
    newPassword: string;

    @ApiProperty({ example: 'new1234' })
    @IsString()
    @MinLength(6)
    confirmPassword: string;
}