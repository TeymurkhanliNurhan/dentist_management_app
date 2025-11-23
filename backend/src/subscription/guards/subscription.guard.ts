import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';

/**
 * Subscription Guard
 * 
 * This guard protects routes that require an active subscription.
 * 
 * How it works:
 * 1. Extracts the authenticated dentist ID from the JWT token
 * 2. Validates the dentist's subscription status
 * 3. If inactive, returns 403 with message "Pay amount to use the app"
 * 4. If active, allows the request to proceed
 * 
 * Usage:
 * Apply this guard to routes that should be restricted for inactive dentists:
 * 
 * @UseGuards(JwtAuthGuard, SubscriptionGuard)
 * @Get('protected-route')
 * getProtectedData() { ... }
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.warn('SubscriptionGuard: No user found in request');
      throw new ForbiddenException({ message: 'Pay amount to use the app' });
    }

    const dentistId = user.userId;

    try {
      // Validate and update subscription status (ensures DB is current)
      const isActive = await this.subscriptionService.validateAndUpdateSubscription(dentistId);

      if (!isActive) {
        this.logger.log(`SubscriptionGuard: Access denied for inactive dentist ${dentistId}`);
        throw new ForbiddenException({ message: 'Pay amount to use the app' });
      }

      // Subscription is active, allow access
      return true;
    } catch (error) {
      // If it's already a ForbiddenException, re-throw it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // For other errors, log and deny access
      this.logger.error(`SubscriptionGuard: Error checking subscription for dentist ${dentistId}: ${error.message}`);
      throw new ForbiddenException({ message: 'Pay amount to use the app' });
    }
  }
}



