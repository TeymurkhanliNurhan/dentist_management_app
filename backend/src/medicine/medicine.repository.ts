import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Medicine } from './entities/medicine.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Clinic } from '../clinic/entities/clinic.entity';
import { ToothTreatmentMedicine } from '../tooth_treatment_medicine/entities/tooth_treatment_medicine.entity';
import { PurchaseMedicine } from '../purchase_medicine/entities/purchase_medicine.entity';

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
    input: {
      name: string;
      description: string;
      price: number;
      stock: number;
      stockLimit?: number | null;
      purchasePrice: number;
    },
  ): Promise<Medicine> {
    const clinic = await this.getClinicForDentist(dentistId);
    const maxIdResult = await this.repo
      .createQueryBuilder('medicine')
      .select('MAX(medicine.id)', 'maxId')
      .getRawOne<{ maxId: string | null }>();
    const nextMedicineId = maxIdResult?.maxId ? Number(maxIdResult.maxId) + 1 : 1;

    const med = this.repo.create({ id: nextMedicineId, ...input, clinic });
    return await this.repo.save(med);
  }

  async updateMedicineEnsureOwnership(
    dentistId: number,
    id: number,
    updates: Partial<{
      name: string;
      description: string;
      price: number;
      stock: number;
      stockLimit: number | null;
      purchasePrice: number;
    }>,
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
    if (updates.stock !== undefined) med.stock = updates.stock;
    if (updates.stockLimit !== undefined) med.stockLimit = updates.stockLimit;
    if (updates.purchasePrice !== undefined)
      med.purchasePrice = updates.purchasePrice;
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

  async deleteMedicineEnsureOwnership(
    dentistId: number,
    id: number,
  ): Promise<{ deletedId: number }> {
    const clinic = await this.getClinicForDentist(dentistId);
    const med = await this.repo.findOne({
      where: { id, clinic: { id: clinic.id } },
    });
    if (!med) throw new Error('Forbidden');

    const ttmCount = await this.dataSource
      .getRepository(ToothTreatmentMedicine)
      .count({ where: { medicine: id } });
    const pmCount = await this.dataSource
      .getRepository(PurchaseMedicine)
      .count({ where: { medicine: { id } } });
    if (ttmCount > 0 || pmCount > 0) throw new Error('Referenced');

    await this.repo.remove(med);
    return { deletedId: id };
  }
}
