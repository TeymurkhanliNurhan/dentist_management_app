import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for capturing a PayPal payment
 */
export class CapturePaymentDto {
  @ApiProperty({
    description: 'PayPal order ID returned from create order endpoint',
    example: '5O190127TN364715T',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}



