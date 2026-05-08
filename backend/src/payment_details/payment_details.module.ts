import { Module } from '@nestjs/common';
import { PaymentDetailsController } from './payment_details.controller';
import { PaymentDetailsService } from './payment_details.service';
import { PaymentDetailsRepository } from './payment_details.repository';

@Module({
  controllers: [PaymentDetailsController],
  providers: [PaymentDetailsService, PaymentDetailsRepository],
})
export class PaymentDetailsModule {}
