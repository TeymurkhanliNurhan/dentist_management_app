import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    const publishableKey = this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (!secretKey || !publishableKey) {
      this.logger.warn('Stripe credentials not configured. Payment features will not work.');
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover',
      });
    }
  }

  async createPaymentIntent(): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: 100,
        currency: 'usd',
        description: 'Monthly subscription payment',
        metadata: {
          type: 'subscription',
        },
      });

      this.logger.log(`Stripe payment intent created: ${paymentIntent.id}`);
      return {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      this.logger.error(`Error creating Stripe payment intent: ${error.message}`);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; transactionId?: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        this.logger.log(`Stripe payment already succeeded: ${paymentIntentId}`);
        return {
          success: true,
          transactionId: paymentIntent.latest_charge as string,
        };
      }

      if (paymentIntent.status === 'requires_capture') {
        const confirmedIntent = await this.stripe.paymentIntents.capture(paymentIntentId);
        if (confirmedIntent.status === 'succeeded') {
          this.logger.log(`Stripe payment captured successfully: ${paymentIntentId}`);
          return {
            success: true,
            transactionId: confirmedIntent.latest_charge as string,
          };
        }
      }

      if (paymentIntent.status === 'requires_confirmation') {
        const confirmedIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
        if (confirmedIntent.status === 'succeeded') {
          this.logger.log(`Stripe payment confirmed successfully: ${paymentIntentId}`);
          return {
            success: true,
            transactionId: confirmedIntent.latest_charge as string,
          };
        }
      }

      this.logger.warn(`Stripe payment intent status: ${paymentIntent.status} for ${paymentIntentId}`);
      return { success: false };
    } catch (error: any) {
      this.logger.error(`Error confirming Stripe payment: ${error.message}`);
      return { success: false };
    }
  }

  getPublishableKey(): string {
    return this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || '';
  }
}
