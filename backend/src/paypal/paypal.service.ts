import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiBase: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('PAYPAL_SECRET') || '';
    this.apiBase = this.configService.get<string>('PAYPAL_API_BASE') || 'https://api-m.sandbox.paypal.com';

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('PayPal credentials not configured. Payment features will not work.');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken as string;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await fetch(`${this.apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to get PayPal access token: ${error}`);
        throw new BadRequestException('Failed to authenticate with PayPal');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);
      
      if (!this.accessToken) {
        throw new BadRequestException('Failed to get access token from PayPal');
      }
      
      return this.accessToken;
    } catch (error) {
      this.logger.error(`Error getting PayPal access token: ${error.message}`);
      throw new BadRequestException('Failed to authenticate with PayPal');
    }
  }

  async createOrder(): Promise<{ orderId: string; approvalUrl: string }> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.error('PayPal credentials not configured');
      throw new BadRequestException('PayPal is not configured. Please use Stripe for payments or configure PayPal credentials.');
    }

    try {
      const accessToken = await this.getAccessToken();

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '1.00',
            },
            description: 'Monthly subscription payment',
          },
        ],
        application_context: {
          brand_name: 'Dentist Management App',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/subscription/success`,
          cancel_url: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/subscription/cancel`,
        },
      };

      const response = await fetch(`${this.apiBase}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        this.logger.error(`Failed to create PayPal order: ${errorText}`);
        
        if (errorData.name === 'UNPROCESSABLE_ENTITY') {
          const issue = errorData.details?.[0]?.issue;
          if (issue === 'PAYEE_ACCOUNT_RESTRICTED') {
            throw new BadRequestException('PayPal account is restricted. Please check your PayPal merchant account status or use Stripe instead.');
          }
        }
        
        throw new BadRequestException(errorData.message || 'Failed to create payment order. Please try again or use Stripe.');
      }

      const order = await response.json();
      
      const approvalLink = order.links?.find((link: any) => link.rel === 'approve');
      const approvalUrl = approvalLink?.href || '';

      this.logger.log(`PayPal order created: ${order.id}`);
      return {
        orderId: order.id,
        approvalUrl,
      };
    } catch (error) {
      this.logger.error(`Error creating PayPal order: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create payment order');
    }
  }

  async captureOrder(orderId: string): Promise<{ success: boolean; transactionId?: string }> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.apiBase}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to capture PayPal order ${orderId}: ${error}`);
        return { success: false };
      }

      const capture = await response.json();
      
      if (capture.status === 'COMPLETED') {
        const transactionId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        this.logger.log(`PayPal order captured successfully: ${orderId}, transaction: ${transactionId}`);
        return {
          success: true,
          transactionId,
        };
      }

      this.logger.warn(`PayPal order capture incomplete: ${orderId}, status: ${capture.status}`);
      return { success: false };
    } catch (error) {
      this.logger.error(`Error capturing PayPal order: ${error.message}`);
      return { success: false };
    }
  }
}
