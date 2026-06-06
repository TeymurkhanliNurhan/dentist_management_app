import { Module } from '@nestjs/common';
import { ClinicModule } from '../clinic/clinic.module';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [ClinicModule],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
