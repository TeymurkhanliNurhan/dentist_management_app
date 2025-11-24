import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';

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
      const isActive = await this.subscriptionService.validateAndUpdateSubscription(dentistId);

      if (!isActive) {
        this.logger.log(`SubscriptionGuard: Access denied for inactive dentist ${dentistId}`);
        throw new ForbiddenException({ message: 'Pay amount to use the app' });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`SubscriptionGuard: Error checking subscription for dentist ${dentistId}: ${error.message}`);
      throw new ForbiddenException({ message: 'Pay amount to use the app' });
    }
  }
}
