import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { RandevueRepository } from './randevue.repository';
import { WhatsappNotificationService } from '../whatsapp/whatsapp-notification.service';

@Injectable()
export class RandevueReminderScheduler {
  private readonly logger = new Logger(RandevueReminderScheduler.name);

  constructor(
    private readonly randevueRepository: RandevueRepository,
    private readonly whatsappNotifications: WhatsappNotificationService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  private reminderKey(randevueId: number, dayKey: string): string {
    return `wa-reminder:${randevueId}:${dayKey}`;
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendTodayAppointmentReminders(): Promise<void> {
    const randevues =
      await this.randevueRepository.findTodayBookedRandevuesForReminders();

    if (randevues.length === 0) {
      this.logger.log('No booked randevues found for today reminders');
      return;
    }

    const offsetMin = Number.parseInt(
      process.env.CLINIC_TIMEZONE_OFFSET_MINUTES ?? '240',
      10,
    );
    const clinicNow = new Date(Date.now() + offsetMin * 60_000);
    const dayKey = `${clinicNow.getUTCFullYear()}-${String(clinicNow.getUTCMonth() + 1).padStart(2, '0')}-${String(clinicNow.getUTCDate()).padStart(2, '0')}`;

    let sent = 0;
    for (const randevue of randevues) {
      const key = this.reminderKey(randevue.id, dayKey);
      const alreadySent = await this.redisClient.get(key);
      if (alreadySent) {
        continue;
      }

      const success =
        await this.whatsappNotifications.sendAppointmentReminder(randevue);
      if (success) {
        await this.redisClient.set(key, '1', 'EX', 60 * 60 * 48);
        sent += 1;
      }
    }

    this.logger.log(
      `Appointment reminder job finished: ${sent}/${randevues.length} sent`,
    );
  }
}
