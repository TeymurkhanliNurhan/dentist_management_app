import { Module } from '@nestjs/common';
import { RandevueController } from './randevue.controller';
import { RandevueService } from './randevue.service';
import { RandevueRepository } from './randevue.repository';
import { RandevueReminderScheduler } from './randevue-reminder.scheduler';
import { AppointmentModule } from '../appointment/appointment.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { RedisClientProvider } from '../redis.provider';

@Module({
  imports: [AppointmentModule, WhatsappModule],
  controllers: [RandevueController],
  providers: [
    RandevueService,
    RandevueRepository,
    RandevueReminderScheduler,
    RedisClientProvider,
  ],
  exports: [RandevueRepository],
})
export class RandevueModule {}
