import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClinicRepository } from './clinic.repository';
import { UpdateClinicWhatsappDto } from './dto/update-clinic-whatsapp.dto';
import { ClinicWhatsappResponseDto } from './dto/clinic-whatsapp-response.dto';
import { Clinic } from './entities/clinic.entity';
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  maskIntegrationSecret,
} from '../common/integration-crypto.util';

@Injectable()
export class ClinicService {
  constructor(
    private readonly repo: ClinicRepository,
    private readonly configService: ConfigService,
  ) {}

  private ensureDirectorRole(role?: string): void {
    if ((role ?? '').trim().toLowerCase() !== 'director') {
      throw new ForbiddenException(
        'Only the director of a clinic can manage WhatsApp integration',
      );
    }
  }

  private getEncryptionKey(): string {
    const key = this.configService.get<string>('INTEGRATION_ENCRYPTION_KEY');
    if (!key) {
      throw new BadRequestException(
        'INTEGRATION_ENCRYPTION_KEY is not configured on the server',
      );
    }
    return key;
  }

  private decryptToken(stored: string | null | undefined): string | null {
    if (!stored) {
      return null;
    }
    return decryptIntegrationSecret(stored, this.getEncryptionKey());
  }

  private toWhatsappResponse(clinic: Clinic): ClinicWhatsappResponseDto {
    const decryptedToken = this.decryptToken(clinic.whatsappAccessToken);

    return {
      clinicId: clinic.id,
      whatsappEnabled: clinic.whatsappEnabled,
      whatsappPhoneNumberId: clinic.whatsappPhoneNumberId ?? null,
      whatsappBusinessAccountId: clinic.whatsappBusinessAccountId ?? null,
      whatsappDisplayPhone: clinic.whatsappDisplayPhone ?? null,
      accessTokenConfigured: !!clinic.whatsappAccessToken,
      accessTokenMasked: maskIntegrationSecret(decryptedToken),
    };
  }

  async getWhatsappIntegration(
    staffId: number,
    role: string | undefined,
  ): Promise<ClinicWhatsappResponseDto> {
    this.ensureDirectorRole(role);

    try {
      const clinicId = await this.repo.getClinicIdForDirectorStaff(staffId);
      const clinic = await this.repo.findById(clinicId);
      if (!clinic) {
        throw new NotFoundException('Clinic not found');
      }
      return this.toWhatsappResponse(clinic);
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      if (error?.message?.includes('Director not found')) {
        throw new ForbiddenException(
          'Only the director of a clinic can manage WhatsApp integration',
        );
      }
      throw new BadRequestException('Failed to load WhatsApp integration');
    }
  }

  async patchWhatsappIntegration(
    staffId: number,
    role: string | undefined,
    dto: UpdateClinicWhatsappDto,
  ): Promise<ClinicWhatsappResponseDto> {
    this.ensureDirectorRole(role);

    try {
      const clinicId = await this.repo.getClinicIdForDirectorStaff(staffId);
      const existing = await this.repo.findById(clinicId);
      if (!existing) {
        throw new NotFoundException('Clinic not found');
      }

      const nextEnabled = dto.whatsappEnabled ?? existing.whatsappEnabled;
      const nextPhoneNumberId =
        dto.whatsappPhoneNumberId !== undefined
          ? dto.whatsappPhoneNumberId
          : existing.whatsappPhoneNumberId;
      const nextAccessTokenStored =
        dto.whatsappAccessToken !== undefined
          ? encryptIntegrationSecret(
              dto.whatsappAccessToken,
              this.getEncryptionKey(),
            )
          : existing.whatsappAccessToken;

      if (nextEnabled) {
        if (!nextPhoneNumberId) {
          throw new BadRequestException(
            'whatsappPhoneNumberId is required when WhatsApp is enabled',
          );
        }
        if (!nextAccessTokenStored) {
          throw new BadRequestException(
            'whatsappAccessToken is required when WhatsApp is enabled',
          );
        }
      }

      const updated = await this.repo.updateWhatsappIntegration(clinicId, {
        whatsappEnabled: dto.whatsappEnabled,
        whatsappPhoneNumberId:
          dto.whatsappPhoneNumberId !== undefined
            ? dto.whatsappPhoneNumberId
            : undefined,
        whatsappBusinessAccountId:
          dto.whatsappBusinessAccountId !== undefined
            ? dto.whatsappBusinessAccountId
            : undefined,
        whatsappAccessToken:
          dto.whatsappAccessToken !== undefined
            ? nextAccessTokenStored
            : undefined,
        whatsappDisplayPhone:
          dto.whatsappDisplayPhone !== undefined
            ? dto.whatsappDisplayPhone
            : undefined,
      });

      return this.toWhatsappResponse(updated);
    } catch (error: any) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (error?.message?.includes('Director not found')) {
        throw new ForbiddenException(
          'Only the director of a clinic can manage WhatsApp integration',
        );
      }
      throw new BadRequestException('Failed to update WhatsApp integration');
    }
  }

  async getWhatsappCredentialsForClinic(clinicId: number): Promise<{
    enabled: boolean;
    phoneNumberId: string;
    businessAccountId: string | null;
    accessToken: string;
    displayPhone: string | null;
  } | null> {
    const clinic = await this.repo.findById(clinicId);
    if (!clinic?.whatsappEnabled || !clinic.whatsappPhoneNumberId) {
      return null;
    }

    const accessToken = this.decryptToken(clinic.whatsappAccessToken);
    if (!accessToken) {
      return null;
    }

    return {
      enabled: clinic.whatsappEnabled,
      phoneNumberId: clinic.whatsappPhoneNumberId,
      businessAccountId: clinic.whatsappBusinessAccountId ?? null,
      accessToken,
      displayPhone: clinic.whatsappDisplayPhone ?? null,
    };
  }
}
