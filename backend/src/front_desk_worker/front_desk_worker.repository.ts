import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FrontDeskWorker } from './entities/front_desk_worker.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class FrontDeskWorkerRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<FrontDeskWorker> {
    return this.dataSource.getRepository(FrontDeskWorker);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  private async ensureStaffInClinic(staffId: number, clinicId: number) {
    const staff = await this.dataSource.getRepository(Staff).findOne({
      where: { id: staffId, clinicId },
    });
    if (!staff) throw new Error('Staff not found');
    return staff;
  }

  async createForDentist(
    dentistId: number,
    input: { staffId: number },
  ): Promise<FrontDeskWorker> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const staff = await this.ensureStaffInClinic(input.staffId, clinicId);
    const created = this.repo.create({ staffId: staff.id });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: { id?: number; staffId?: number },
  ): Promise<FrontDeskWorker[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('fdw')
      .innerJoinAndSelect('fdw.staff', 'staff')
      .where('staff.clinicId = :clinicId', { clinicId });

    if (filters.id !== undefined) qb.andWhere('fdw.id = :id', { id: filters.id });
    if (filters.staffId !== undefined)
      qb.andWhere('fdw.staffId = :staffId', { staffId: filters.staffId });

    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: { staffId?: number },
  ): Promise<FrontDeskWorker> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('fdw')
      .innerJoinAndSelect('fdw.staff', 'staff')
      .where('fdw.id = :id', { id })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Forbidden');

    if (updates.staffId !== undefined) {
      await this.ensureStaffInClinic(updates.staffId, clinicId);
      existing.staffId = updates.staffId;
    }

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('fdw')
      .innerJoin('fdw.staff', 'staff')
      .where('fdw.id = :id', { id })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Forbidden');

    await this.repo.remove(existing);
  }
}
