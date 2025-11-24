import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment method to use (defaults to paypal if not provided)',
    enum: PaymentMethod,
    example: PaymentMethod.PAYPAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
