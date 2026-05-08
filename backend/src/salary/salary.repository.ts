import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Salary } from './entities/salary.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class SalaryRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Salary> {
    return this.dataSource.getRepository(Salary);
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
  }

  async createForDentist(
    dentistId: number,
    input: {
      staffId: number;
      salary?: number;
      salaryDay?: number;
      treatmentPercentage?: number;
    },
  ): Promise<Salary> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    await this.ensureStaffInClinic(input.staffId, clinicId);
    const existing = await this.repo.findOne({ where: { staffId: input.staffId } });
    if (existing) throw new Error('Salary already exists');

    const created = this.repo.create({
      staffId: input.staffId,
      salary: input.salary ?? null,
      salaryDay: input.salaryDay ?? null,
      treatmentPercentage: input.treatmentPercentage ?? null,
    });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: { staffId?: number; salaryDay?: number },
  ): Promise<Salary[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('salary')
      .innerJoinAndSelect('salary.staff', 'staff')
      .where('staff.clinicId = :clinicId', { clinicId });

    if (filters.staffId !== undefined) {
      qb.andWhere('salary.staffId = :staffId', { staffId: filters.staffId });
    }
    if (filters.salaryDay !== undefined) {
      qb.andWhere('salary.salaryDay = :salaryDay', { salaryDay: filters.salaryDay });
    }

    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    staffId: number,
    updates: {
      salary?: number | null;
      salaryDay?: number | null;
      treatmentPercentage?: number | null;
    },
  ): Promise<Salary> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('salary')
      .innerJoinAndSelect('salary.staff', 'staff')
      .where('salary.staffId = :staffId', { staffId })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Salary not found');

    if (updates.salary !== undefined) existing.salary = updates.salary;
    if (updates.salaryDay !== undefined) existing.salaryDay = updates.salaryDay;
    if (updates.treatmentPercentage !== undefined) {
      existing.treatmentPercentage = updates.treatmentPercentage;
    }

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, staffId: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('salary')
      .innerJoin('salary.staff', 'staff')
      .where('salary.staffId = :staffId', { staffId })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Salary not found');

    await this.repo.remove(existing);
  }
}
