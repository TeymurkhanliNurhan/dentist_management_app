import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ClinicService } from '../clinic/clinic.service';

type WhatsappTemplateComponent = {
  type: 'body';
  parameters: Array<{ type: 'text'; text: string }>;
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly graphApiVersion = 'v21.0';

  constructor(private readonly clinicService: ClinicService) {}

  private normalizeRecipientPhone(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  private async postMessage(
    phoneNumberId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(
      `https://graph.facebook.com/${this.graphApiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `WhatsApp API request failed (${response.status}): ${errorBody}`,
      );
      throw new BadRequestException('Failed to send WhatsApp message');
    }
  }

  async sendTextMessage(
    clinicId: number,
    toPhone: string,
    message: string,
  ): Promise<void> {
    const credentials =
      await this.clinicService.getWhatsappCredentialsForClinic(clinicId);
    if (!credentials) {
      throw new BadRequestException(
        'WhatsApp integration is not configured for this clinic',
      );
    }

    await this.postMessage(
      credentials.phoneNumberId,
      credentials.accessToken,
      {
        messaging_product: 'whatsapp',
        to: this.normalizeRecipientPhone(toPhone),
        type: 'text',
        text: { body: message },
      },
    );
  }

  async sendTemplateMessage(
    clinicId: number,
    toPhone: string,
    templateName: string,
    languageCode: string,
    components?: WhatsappTemplateComponent[],
  ): Promise<void> {
    const credentials =
      await this.clinicService.getWhatsappCredentialsForClinic(clinicId);
    if (!credentials) {
      throw new BadRequestException(
        'WhatsApp integration is not configured for this clinic',
      );
    }

    await this.postMessage(
      credentials.phoneNumberId,
      credentials.accessToken,
      {
        messaging_product: 'whatsapp',
        to: this.normalizeRecipientPhone(toPhone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components?.length ? { components } : {}),
        },
      },
    );
  }
}
