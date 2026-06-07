import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { Randevue } from '../randevue/entities/randevue.entity';

@Injectable()
export class WhatsappNotificationService {
  private readonly logger = new Logger(WhatsappNotificationService.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  private get templateLanguage(): string {
    return this.configService.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ?? 'en';
  }

  private get passwordResetTemplate(): string {
    return (
      this.configService.get<string>('WHATSAPP_TEMPLATE_PASSWORD_RESET') ??
      'patient_password_reset'
    );
  }

  private get appointmentConfirmedTemplate(): string {
    return (
      this.configService.get<string>('WHATSAPP_TEMPLATE_APPOINTMENT_CONFIRMED') ??
      'appointment_confirmed'
    );
  }

  private get appointmentReminderTemplate(): string {
    return (
      this.configService.get<string>('WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER') ??
      'appointment_reminder'
    );
  }

  private get clinicTimezoneOffsetMinutes(): number {
    return Number.parseInt(
      this.configService.get<string>('CLINIC_TIMEZONE_OFFSET_MINUTES') ??
        '240',
      10,
    );
  }

  private toClinicLocal(date: Date): Date {
    return new Date(
      date.getTime() + this.clinicTimezoneOffsetMinutes * 60_000,
    );
  }

  private formatClinicDate(date: Date): string {
    const local = this.toClinicLocal(date);
    const y = local.getUTCFullYear();
    const m = String(local.getUTCMonth() + 1).padStart(2, '0');
    const d = String(local.getUTCDate()).padStart(2, '0');
    return `${d}.${m}.${y}`;
  }

  private formatClinicTime(date: Date): string {
    const local = this.toClinicLocal(date);
    const hh = String(local.getUTCHours()).padStart(2, '0');
    const mm = String(local.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private dentistLabel(randevue: Randevue): string {
    const staff = randevue.dentist?.staff;
    if (!staff) {
      return 'Clinic team';
    }
    return `${staff.name} ${staff.surname}`.trim();
  }

  private async sendTemplateSafely(
    clinicId: number,
    phone: string,
    templateName: string,
    parameters: string[],
    context: string,
  ): Promise<boolean> {
    if (!phone?.trim()) {
      this.logger.warn(`${context}: patient phone is missing`);
      return false;
    }

    try {
      await this.whatsappService.sendTemplateMessage(
        clinicId,
        phone,
        templateName,
        this.templateLanguage,
        [
          {
            type: 'body',
            parameters: parameters.map((text) => ({ type: 'text' as const, text })),
          },
        ],
      );
      this.logger.log(`${context}: WhatsApp sent to ${phone}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `${context}: failed to send WhatsApp (${error?.message ?? error})`,
      );
      return false;
    }
  }

  async sendPatientPasswordReset(
    clinicId: number,
    phone: string,
    patientName: string,
    code: string,
  ): Promise<boolean> {
    return this.sendTemplateSafely(
      clinicId,
      phone,
      this.passwordResetTemplate,
      [patientName, code],
      'Patient password reset',
    );
  }

  async sendAppointmentConfirmed(randevue: Randevue): Promise<boolean> {
    const clinicId = randevue.patient?.clinic?.id;
    const phone = randevue.patient?.phone;
    if (!clinicId) {
      this.logger.warn('Appointment confirmed: clinic id missing on randevue');
      return false;
    }

    const start =
      randevue.date instanceof Date
        ? randevue.date
        : new Date(randevue.date as unknown as string);

    return this.sendTemplateSafely(
      clinicId,
      phone ?? '',
      this.appointmentConfirmedTemplate,
      [
        `${randevue.patient.name} ${randevue.patient.surname}`.trim(),
        randevue.patient.clinic.name,
        this.formatClinicDate(start),
        this.formatClinicTime(start),
        this.dentistLabel(randevue),
      ],
      `Appointment confirmed (randevue ${randevue.id})`,
    );
  }

  async sendAppointmentReminder(randevue: Randevue): Promise<boolean> {
    const clinicId = randevue.patient?.clinic?.id;
    const phone = randevue.patient?.phone;
    if (!clinicId) {
      this.logger.warn('Appointment reminder: clinic id missing on randevue');
      return false;
    }

    const start =
      randevue.date instanceof Date
        ? randevue.date
        : new Date(randevue.date as unknown as string);

    return this.sendTemplateSafely(
      clinicId,
      phone ?? '',
      this.appointmentReminderTemplate,
      [
        `${randevue.patient.name} ${randevue.patient.surname}`.trim(),
        randevue.patient.clinic.name,
        this.formatClinicTime(start),
        this.dentistLabel(randevue),
      ],
      `Appointment reminder (randevue ${randevue.id})`,
    );
  }
}
