import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { PayPalModule } from '../paypal/paypal.module';
import { Dentist } from '../dentist/entities/dentist.entity';

/**
 * Subscription Module
 * 
 * This module handles subscription management:
 * - PayPal payment integration
 * - Subscription validation
 * - Automatic deactivation of expired subscriptions (cron job)
 * - Route protection for inactive subscriptions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dentist]),
    PayPalModule,
    ScheduleModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionGuard],
  exports: [SubscriptionService, SubscriptionGuard],
})
export class SubscriptionModule {}

