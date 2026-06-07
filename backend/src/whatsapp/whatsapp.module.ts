import { Module } from '@nestjs/common';
import { ClinicModule } from '../clinic/clinic.module';
import { WhatsappService } from './whatsapp.service';
import { WhatsappNotificationService } from './whatsapp-notification.service';

@Module({
  imports: [ClinicModule],
  providers: [WhatsappService, WhatsappNotificationService],
  exports: [WhatsappService, WhatsappNotificationService],
})
export class WhatsappModule {}
