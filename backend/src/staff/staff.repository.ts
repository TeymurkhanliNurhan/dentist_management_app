import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { GetStaffDto } from './dto/get-staff.dto';

@Injectable()
export class StaffRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Staff> {
    return this.dataSource.getRepository(Staff);
  }

  async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });

    if (!dentist?.staff?.clinicId) {
      throw new Error('Dentist not found');
    }

    return dentist.staff.clinicId;
  }

  async createForClinic(input: Partial<Staff>): Promise<Staff> {
    const entity = this.repo.create(input);
    return await this.repo.save(entity);
  }

  async findByIdInClinic(id: number, clinicId: number): Promise<Staff | null> {
    return await this.repo.findOne({ where: { id, clinicId } });
  }

  async update(staff: Staff): Promise<Staff> {
    return await this.repo.save(staff);
  }

  async findAllInClinicWithFilters(
    clinicId: number,
    filters: GetStaffDto,
  ): Promise<Staff[]> {
    const qb = this.repo
      .createQueryBuilder('staff')
      .where('staff.clinicId = :clinicId', { clinicId });

    if (filters.id !== undefined) {
      qb.andWhere('staff.id = :id', { id: filters.id });
    }
    if (filters.name !== undefined) {
      qb.andWhere('LOWER(staff.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`,
      });
    }
    if (filters.surname !== undefined) {
      qb.andWhere('LOWER(staff.surname) LIKE LOWER(:surname)', {
        surname: `%${filters.surname}%`,
      });
    }
    if (filters.birthDate !== undefined) {
      qb.andWhere('staff.birthDate = :birthDate', {
        birthDate: filters.birthDate,
      });
    }
    if (filters.gmail !== undefined) {
      qb.andWhere('LOWER(staff.gmail) LIKE LOWER(:gmail)', {
        gmail: `%${filters.gmail}%`,
      });
    }
    if (filters.active !== undefined) {
      qb.andWhere('staff.active = :active', { active: filters.active });
    }

    return await qb.getMany();
  }
}
