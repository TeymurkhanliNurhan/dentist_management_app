import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { ContactDto } from './dto/contact.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  getContactInfo(): { email: string; phone: string } {
    const email = this.configService.get<string>('CONTACT_EMAIL') || this.configService.get<string>('GMAIL_USER') || 'Not configured';
    const phone = this.configService.get<string>('CONTACT_NUMBER') || 'Not configured';
    return { email, phone };
  }

  async sendContactEmail(
    contactDto: ContactDto,
    files: Express.Multer.File[],
  ): Promise<{ message: string }> {
    const contactEmail = this.configService.get<string>('CONTACT_EMAIL');
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const recipientEmail = contactEmail || gmailUser;
    
    this.logger.log(`=== Contact Email Debug ===`);
    this.logger.log(`CONTACT_EMAIL from env: ${contactEmail || 'NOT SET'}`);
    this.logger.log(`GMAIL_USER from env: ${gmailUser || 'NOT SET'}`);
    this.logger.log(`Recipient email: ${recipientEmail}`);
    this.logger.log(`Subject: ${contactDto.header}, Files: ${files?.length || 0}`);
    
    if (!recipientEmail) {
      this.logger.error('No contact email configured - neither CONTACT_EMAIL nor GMAIL_USER is set');
      throw new Error('Contact email not configured. Please set CONTACT_EMAIL or GMAIL_USER in .env file');
    }

    try {
      await this.emailService.sendContactEmail(
        recipientEmail,
        contactDto.header,
        contactDto.context,
        files,
      );
      this.logger.log(`Contact email successfully sent to ${recipientEmail}`);
      return { message: 'Your message has been sent successfully!' };
    } catch (error: any) {
      this.logger.error(`Failed to send contact email to ${recipientEmail}:`, error);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      throw new Error(`Failed to send contact email: ${error.message || 'Unknown error'}`);
    }
  }
}


