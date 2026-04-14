import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Medicine } from './entities/medicine.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Clinic } from '../clinic/entities/clinic.entity';

@Injectable()
export class MedicineRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Medicine> {
    return this.dataSource.getRepository(Medicine);
  }

  private async getClinicForDentist(dentistId: number): Promise<Clinic> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff?.clinicId) throw new Error('Dentist not found');
    const clinic = await this.dataSource
      .getRepository(Clinic)
      .findOne({ where: { id: dentist.staff.clinicId } });
    if (!clinic) throw new Error('Clinic not found');
    return clinic;
  }

  async createMedicineForDentist(
    dentistId: number,
    input: { name: string; description: string; price: number },
  ): Promise<Medicine> {
    const clinic = await this.getClinicForDentist(dentistId);
    const med = this.repo.create({ ...input, clinic });
    return await this.repo.save(med);
  }

  async updateMedicineEnsureOwnership(
    dentistId: number,
    id: number,
    updates: Partial<{ name: string; description: string; price: number }>,
  ): Promise<Medicine> {
    const clinic = await this.getClinicForDentist(dentistId);
    const med = await this.repo.findOne({
      where: { id, clinic: { id: clinic.id } },
    });
    if (!med) throw new Error('Forbidden');
    if (updates.name !== undefined) med.name = updates.name;
    if (updates.description !== undefined)
      med.description = updates.description;
    if (updates.price !== undefined) med.price = updates.price;
    return await this.repo.save(med);
  }

  async findMedicinesForDentist(
    dentistId: number,
    filters: { id?: number; name?: string },
  ): Promise<Medicine[]> {
    const clinic = await this.getClinicForDentist(dentistId);
    const queryBuilder = this.repo
      .createQueryBuilder('medicine')
      .where('medicine.clinicId = :clinicId', { clinicId: clinic.id });

    if (filters.id !== undefined) {
      queryBuilder.andWhere('medicine.id = :id', { id: filters.id });
    }
    if (filters.name !== undefined) {
      queryBuilder.andWhere('LOWER(medicine.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`,
      });
    }

    return await queryBuilder.getMany();
  }
}
