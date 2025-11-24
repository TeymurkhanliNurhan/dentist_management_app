import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { PayPalModule } from '../paypal/paypal.module';
import { StripeModule } from '../stripe/stripe.module';
import { Dentist } from '../dentist/entities/dentist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dentist]),
    PayPalModule,
    StripeModule,
    ScheduleModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionGuard],
  exports: [SubscriptionService, SubscriptionGuard],
})
export class SubscriptionModule {}
