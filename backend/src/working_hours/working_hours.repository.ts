import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkingHours } from './entities/working_hours.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class WorkingHoursRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<WorkingHours> {
    return this.dataSource.getRepository(WorkingHours);
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
    input: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      staffId: number;
    },
  ): Promise<WorkingHours> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const staff = await this.ensureStaffInClinic(input.staffId, clinicId);
    const created = this.repo.create({
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      staffId: staff.id,
    });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: {
      id?: number;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      staffId?: number;
    },
  ): Promise<WorkingHours[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('wh')
      .innerJoinAndSelect('wh.staff', 'staff')
      .where('staff.clinicId = :clinicId', { clinicId });

    if (filters.id !== undefined)
      qb.andWhere('wh.id = :id', { id: filters.id });
    if (filters.dayOfWeek !== undefined)
      qb.andWhere('wh.dayOfWeek = :dayOfWeek', {
        dayOfWeek: filters.dayOfWeek,
      });
    if (filters.staffId !== undefined)
      qb.andWhere('wh.staffId = :staffId', { staffId: filters.staffId });
    if (filters.startTime !== undefined)
      qb.andWhere('wh.startTime = :startTime', {
        startTime: filters.startTime,
      });
    if (filters.endTime !== undefined)
      qb.andWhere('wh.endTime = :endTime', { endTime: filters.endTime });

    return await qb.getMany();
  }

  async findForStaff(
    staffId: number,
    filters: {
      id?: number;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<WorkingHours[]> {
    const qb = this.repo
      .createQueryBuilder('wh')
      .innerJoinAndSelect('wh.staff', 'staff')
      .where('wh.staffId = :staffId', { staffId });

    if (filters.id !== undefined) qb.andWhere('wh.id = :id', { id: filters.id });
    if (filters.dayOfWeek !== undefined)
      qb.andWhere('wh.dayOfWeek = :dayOfWeek', {
        dayOfWeek: filters.dayOfWeek,
      });
    if (filters.startTime !== undefined)
      qb.andWhere('wh.startTime = :startTime', {
        startTime: filters.startTime,
      });
    if (filters.endTime !== undefined)
      qb.andWhere('wh.endTime = :endTime', { endTime: filters.endTime });

    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      staffId?: number;
    },
  ): Promise<WorkingHours> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('wh')
      .innerJoinAndSelect('wh.staff', 'staff')
      .where('wh.id = :id', { id })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Forbidden');

    if (updates.staffId !== undefined) {
      await this.ensureStaffInClinic(updates.staffId, clinicId);
      existing.staffId = updates.staffId;
    }
    if (updates.dayOfWeek !== undefined) existing.dayOfWeek = updates.dayOfWeek;
    if (updates.startTime !== undefined) existing.startTime = updates.startTime;
    if (updates.endTime !== undefined) existing.endTime = updates.endTime;

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('wh')
      .innerJoin('wh.staff', 'staff')
      .where('wh.id = :id', { id })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Forbidden');

    await this.repo.remove(existing);
  }
}
