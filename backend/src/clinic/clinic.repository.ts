import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity';
import { Staff } from '../staff/entities/staff.entity';

export type ClinicWhatsappUpdates = {
  whatsappEnabled?: boolean;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessAccountId?: string | null;
  whatsappAccessToken?: string | null;
  whatsappDisplayPhone?: string | null;
};

@Injectable()
export class ClinicRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get clinicRepo(): Repository<Clinic> {
    return this.dataSource.getRepository(Clinic);
  }

  async getClinicIdForDirectorStaff(staffId: number): Promise<number> {
    const staff = await this.dataSource.getRepository(Staff).findOne({
      where: { id: staffId },
      relations: ['director'],
    });

    if (!staff?.director) {
      throw new Error('Director not found');
    }

    if ((staff.role ?? '').trim().toLowerCase() !== 'director') {
      throw new Error('Forbidden');
    }

    return staff.clinicId;
  }

  async findById(clinicId: number): Promise<Clinic | null> {
    return await this.clinicRepo.findOne({ where: { id: clinicId } });
  }

  async updateWhatsappIntegration(
    clinicId: number,
    updates: ClinicWhatsappUpdates,
  ): Promise<Clinic> {
    const clinic = await this.findById(clinicId);
    if (!clinic) {
      throw new Error('Clinic not found');
    }

    if (updates.whatsappEnabled !== undefined) {
      clinic.whatsappEnabled = updates.whatsappEnabled;
    }
    if (updates.whatsappPhoneNumberId !== undefined) {
      clinic.whatsappPhoneNumberId = updates.whatsappPhoneNumberId;
    }
    if (updates.whatsappBusinessAccountId !== undefined) {
      clinic.whatsappBusinessAccountId = updates.whatsappBusinessAccountId;
    }
    if (updates.whatsappAccessToken !== undefined) {
      clinic.whatsappAccessToken = updates.whatsappAccessToken;
    }
    if (updates.whatsappDisplayPhone !== undefined) {
      clinic.whatsappDisplayPhone = updates.whatsappDisplayPhone;
    }

    return await this.clinicRepo.save(clinic);
  }
}
