import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CaptureStripePaymentDto {
  @ApiProperty({
    description: 'Stripe payment intent ID',
    example: 'pi_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
