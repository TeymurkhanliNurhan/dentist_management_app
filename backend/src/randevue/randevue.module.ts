import { Module } from '@nestjs/common';
import { RandevueController } from './randevue.controller';
import { RandevueService } from './randevue.service';
import { RandevueRepository } from './randevue.repository';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [AppointmentModule],
  controllers: [RandevueController],
  providers: [RandevueService, RandevueRepository],
})
export class RandevueModule {}
