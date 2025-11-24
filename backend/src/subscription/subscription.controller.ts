import { Controller, Post, Body, UseGuards, Request, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PayPalService } from '../paypal/paypal.service';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionService } from './subscription.service';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { CaptureStripePaymentDto } from './dto/capture-stripe-payment.dto';
import { CreatePaymentDto, PaymentMethod } from './dto/create-payment.dto';
import { LogWriter } from '../log-writer';

@ApiTags('subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly paypalService: PayPalService,
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    const msg = 'SubscriptionController initialized';
    this.logger.debug(msg);
    LogWriter.append('debug', SubscriptionController.name, msg);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create payment order for subscription (PayPal or Stripe)' })
  @ApiResponse({
    status: 201,
    description: 'Payment order created successfully',
  })
  async createOrder(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ): Promise<{ orderId?: string; approvalUrl?: string; clientSecret?: string; paymentIntentId?: string; publishableKey?: string }> {
    const dentistId = req.user.userId;
    const paymentMethod = createPaymentDto.paymentMethod || PaymentMethod.PAYPAL;
    this.logger.log(`Creating ${paymentMethod} order for dentist ${dentistId}`);

    try {
      if (paymentMethod === PaymentMethod.PAYPAL) {
        const result = await this.paypalService.createOrder();
        LogWriter.append('log', SubscriptionController.name, `PayPal order created for dentist ${dentistId}: ${result.orderId}`);
        return {
          orderId: result.orderId,
          approvalUrl: result.approvalUrl,
        };
      } else if (paymentMethod === PaymentMethod.STRIPE) {
        const result = await this.stripeService.createPaymentIntent();
        const publishableKey = this.stripeService.getPublishableKey();
        LogWriter.append('log', SubscriptionController.name, `Stripe payment intent created for dentist ${dentistId}: ${result.paymentIntentId}`);
        return {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
          publishableKey,
        };
      } else {
        throw new Error('Invalid payment method');
      }
    } catch (error) {
      this.logger.error(`Failed to create ${paymentMethod} order for dentist ${dentistId}: ${error.message}`);
      LogWriter.append('error', SubscriptionController.name, `Failed to create payment order: ${error.message}`);
      throw error;
    }
  }

  @Post('capture')
  @ApiOperation({ summary: 'Capture PayPal payment and activate subscription' })
  @ApiResponse({
    status: 200,
    description: 'Payment captured and subscription activated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment successful. Subscription activated.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payment capture failed',
  })
  async capturePayment(
    @Body() captureDto: CapturePaymentDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const dentistId = req.user.userId;
    this.logger.log(`Capturing PayPal payment for dentist ${dentistId}, order: ${captureDto.orderId}`);

    try {
      const captureResult = await this.paypalService.captureOrder(captureDto.orderId);

      if (!captureResult.success) {
        this.logger.warn(`Payment capture failed for dentist ${dentistId}, order: ${captureDto.orderId}`);
        LogWriter.append('warn', SubscriptionController.name, `Payment capture failed for dentist ${dentistId}`);
        throw new Error('Payment capture failed. Please try again.');
      }

      await this.subscriptionService.activateSubscription(dentistId);
      
      this.logger.log(`Payment captured and subscription activated for dentist ${dentistId}`);
      LogWriter.append('log', SubscriptionController.name, `Payment successful for dentist ${dentistId}`);

      return {
        message: 'Payment successful. Subscription activated.',
      };
    } catch (error) {
      this.logger.error(`Error capturing payment for dentist ${dentistId}: ${error.message}`);
      LogWriter.append('error', SubscriptionController.name, `Error capturing payment: ${error.message}`);
      throw error;
    }
  }

  @Post('capture-stripe')
  @ApiOperation({ summary: 'Confirm Stripe payment and activate subscription' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed and subscription activated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment successful. Subscription activated.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payment confirmation failed',
  })
  async captureStripePayment(
    @Body() captureDto: CaptureStripePaymentDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const dentistId = req.user.userId;
    this.logger.log(`Confirming Stripe payment for dentist ${dentistId}, payment intent: ${captureDto.paymentIntentId}`);

    try {
      const confirmResult = await this.stripeService.confirmPayment(captureDto.paymentIntentId);

      if (!confirmResult.success) {
        this.logger.warn(`Payment confirmation failed for dentist ${dentistId}, payment intent: ${captureDto.paymentIntentId}`);
        LogWriter.append('warn', SubscriptionController.name, `Payment confirmation failed for dentist ${dentistId}`);
        throw new Error('Payment confirmation failed. Please try again.');
      }

      await this.subscriptionService.activateSubscription(dentistId);
      
      this.logger.log(`Payment confirmed and subscription activated for dentist ${dentistId}`);
      LogWriter.append('log', SubscriptionController.name, `Stripe payment successful for dentist ${dentistId}`);

      return {
        message: 'Payment successful. Subscription activated.',
      };
    } catch (error) {
      this.logger.error(`Error confirming Stripe payment for dentist ${dentistId}: ${error.message}`);
      LogWriter.append('error', SubscriptionController.name, `Error confirming Stripe payment: ${error.message}`);
      throw error;
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current subscription status' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
  })
  async getSubscriptionStatus(@Request() req: any) {
    const dentistId = req.user.userId;
    
    try {
      const details = await this.subscriptionService.getSubscriptionDetails(dentistId);
      return details;
    } catch (error) {
      this.logger.error(`Error getting subscription status for dentist ${dentistId}: ${error.message}`);
      throw error;
    }
  }
}
