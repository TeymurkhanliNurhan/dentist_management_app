import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class ExpenseRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Expense> {
    return this.dataSource.getRepository(Expense);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  async createForDentist(
    dentistId: number,
    input: {
      name: string;
      description?: string;
      fixedCost?: number;
      dayOfMonth?: number;
    },
  ): Promise<Expense> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const created = this.repo.create({
      name: input.name,
      description: input.description ?? null,
      fixedCost: input.fixedCost ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      clinic: { id: clinicId },
    });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: { id?: number; name?: string; dayOfMonth?: number },
  ): Promise<Expense[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('expense')
      .innerJoinAndSelect('expense.clinic', 'clinic')
      .where('clinic.id = :clinicId', { clinicId });

    if (filters.id !== undefined) qb.andWhere('expense.id = :id', { id: filters.id });
    if (filters.name) qb.andWhere('expense.name ILIKE :name', { name: `%${filters.name}%` });
    if (filters.dayOfMonth !== undefined) {
      qb.andWhere('expense.dayOfMonth = :dayOfMonth', {
        dayOfMonth: filters.dayOfMonth,
      });
    }

    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: {
      name?: string;
      description?: string | null;
      fixedCost?: number | null;
      dayOfMonth?: number | null;
    },
  ): Promise<Expense> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('expense')
      .innerJoinAndSelect('expense.clinic', 'clinic')
      .where('expense.id = :id', { id })
      .andWhere('clinic.id = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Expense not found');

    if (updates.name !== undefined) existing.name = updates.name;
    if (updates.description !== undefined) existing.description = updates.description;
    if (updates.fixedCost !== undefined) existing.fixedCost = updates.fixedCost;
    if (updates.dayOfMonth !== undefined) existing.dayOfMonth = updates.dayOfMonth;

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('expense')
      .innerJoin('expense.clinic', 'clinic')
      .where('expense.id = :id', { id })
      .andWhere('clinic.id = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('Expense not found');

    await this.repo.remove(existing);
  }
}
