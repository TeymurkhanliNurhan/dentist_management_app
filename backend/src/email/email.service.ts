import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailAppPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailAppPassword) {
      this.logger.warn('Gmail credentials not configured. Email service will not work.');
    } else {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    const mailOptions = {
      from: this.configService.get<string>('GMAIL_USER'),
      to: email,
      subject: 'Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14b8a6;">Email Verification</h2>
          <p>Thank you for registering! Please use the following code to verify your email address:</p>
          <div style="background-color: #f0fdfa; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #14b8a6; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    const mailOptions = {
      from: this.configService.get<string>('GMAIL_USER'),
      to: email,
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14b8a6;">Password Reset Request</h2>
          <p>You have requested to reset your password. Please use the following code to verify your request:</p>
          <div style="background-color: #f0fdfa; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #14b8a6; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666;">This code will expire in 5 minutes.</p>
          <p style="color: #666;">If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendContactEmail(
    to: string,
    subject: string,
    message: string,
    attachments?: Express.Multer.File[],
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    const mailOptions: any = {
      from: this.configService.get<string>('GMAIL_USER'),
      to,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14b8a6;">New Contact Form Submission</h2>
          <div style="background-color: #f0fdfa; border: 2px solid #14b8a6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #14b8a6; margin-top: 0;">Subject:</h3>
            <p style="color: #333; font-size: 16px;">${subject}</p>
            <h3 style="color: #14b8a6;">Message:</h3>
            <p style="color: #333; white-space: pre-wrap;">${message}</p>
          </div>
          ${attachments && attachments.length > 0 ? `<p style="color: #666;">This email includes ${attachments.length} attachment(s).</p>` : ''}
        </div>
      `,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      }));
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Contact email sent to ${to}`);
      this.logger.log(`Email result: ${JSON.stringify(result)}`);
    } catch (error: any) {
      this.logger.error(`Failed to send contact email to ${to}:`, error);
      this.logger.error(`Error code: ${error.code}, Error message: ${error.message}`);
      if (error.response) {
        this.logger.error(`Error response: ${JSON.stringify(error.response)}`);
      }
      throw new Error(`Failed to send contact email: ${error.message || 'Unknown error'}`);
    }
  }
}

