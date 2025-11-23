import { Controller, Post, Body, UseGuards, Request, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PayPalService } from '../paypal/paypal.service';
import { SubscriptionService } from './subscription.service';
import { CapturePaymentDto } from './dto/capture-payment.dto';
import { LogWriter } from '../log-writer';

/**
 * Subscription Controller
 * 
 * Handles subscription-related endpoints:
 * - POST /subscription/create - Creates a PayPal order for payment
 * - POST /subscription/capture - Captures payment and activates subscription
 * - GET /subscription/status - Gets current subscription status
 */
@ApiTags('subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly paypalService: PayPalService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    const msg = 'SubscriptionController initialized';
    this.logger.debug(msg);
    LogWriter.append('debug', SubscriptionController.name, msg);
  }

  /**
   * Create a PayPal order for subscription payment
   * 
   * This endpoint creates a $1 USD payment order in PayPal.
   * The frontend should redirect the user to the returned approvalUrl
   * to complete the payment.
   * 
   * @param req - Request object containing authenticated user
   * @returns PayPal order ID and approval URL
   */
  @Post('create')
  @ApiOperation({ summary: 'Create PayPal order for subscription payment' })
  @ApiResponse({
    status: 201,
    description: 'PayPal order created successfully',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', example: '5O190127TN364715T' },
        approvalUrl: { type: 'string', example: 'https://www.sandbox.paypal.com/checkoutnow?token=...' },
      },
    },
  })
  async createOrder(@Request() req: any): Promise<{ orderId: string; approvalUrl: string }> {
    const dentistId = req.user.userId;
    this.logger.log(`Creating PayPal order for dentist ${dentistId}`);

    try {
      const result = await this.paypalService.createOrder();
      LogWriter.append('log', SubscriptionController.name, `PayPal order created for dentist ${dentistId}: ${result.orderId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create PayPal order for dentist ${dentistId}: ${error.message}`);
      LogWriter.append('error', SubscriptionController.name, `Failed to create PayPal order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capture a PayPal payment and activate subscription
   * 
   * This endpoint should be called after the user approves the payment on PayPal.
   * It captures the payment and updates the dentist's subscription status.
   * 
   * @param captureDto - Contains the PayPal order ID
   * @param req - Request object containing authenticated user
   * @returns Success message
   */
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

      // Activate subscription after successful payment
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

  /**
   * Get current subscription status
   * 
   * Returns detailed information about the dentist's subscription:
   * - Whether subscription is active
   * - Created date
   * - Last payment date
   * - Free month status
   * - Days until expiry
   * 
   * @param req - Request object containing authenticated user
   * @returns Subscription details
   */
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



