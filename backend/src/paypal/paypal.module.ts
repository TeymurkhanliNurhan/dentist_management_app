import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayPalService } from './paypal.service';

/**
 * PayPal Module
 * 
 * This module provides PayPal payment integration services.
 * It handles creating PayPal orders and capturing payments.
 * 
 * Environment variables required:
 * - PAYPAL_CLIENT_ID: Your PayPal client ID
 * - PAYPAL_SECRET: Your PayPal secret key
 * - PAYPAL_API_BASE: PayPal API base URL (sandbox or live)
 */
@Module({
  imports: [ConfigModule],
  providers: [PayPalService],
  exports: [PayPalService],
})
export class PayPalModule {}



