import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaymentDetails } from './entities/payment_details.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Expense } from '../expense/entities/expense.entity';
import { Salary } from '../salary/entities/salary.entity';

@Injectable()
export class PaymentDetailsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<PaymentDetails> {
    return this.dataSource.getRepository(PaymentDetails);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  private async ensureExpenseInClinic(expenseId: number, clinicId: number) {
    const expense = await this.dataSource
      .getRepository(Expense)
      .createQueryBuilder('expense')
      .innerJoin('expense.clinic', 'clinic')
      .where('expense.id = :expenseId', { expenseId })
      .andWhere('clinic.id = :clinicId', { clinicId })
      .getOne();
    if (!expense) throw new Error('Expense not found');
  }

  private async ensureSalaryInClinic(salaryId: number, clinicId: number) {
    const salary = await this.dataSource
      .getRepository(Salary)
      .createQueryBuilder('salary')
      .innerJoin('salary.staff', 'staff')
      .where('salary.staffId = :salaryId', { salaryId })
      .andWhere('staff.clinicId = :clinicId', { clinicId })
      .getOne();
    if (!salary) throw new Error('Salary not found');
  }

  async createForDentist(
    dentistId: number,
    input: { date: string; cost: number; expenseId?: number; salaryId?: number },
  ): Promise<PaymentDetails> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (input.expenseId) await this.ensureExpenseInClinic(input.expenseId, clinicId);
    if (input.salaryId) await this.ensureSalaryInClinic(input.salaryId, clinicId);

    const created = this.repo.create({
      date: input.date,
      cost: input.cost,
      expense: input.expenseId ? ({ id: input.expenseId } as Expense) : null,
      salary: input.salaryId ? ({ staffId: input.salaryId } as Salary) : null,
    });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: { id?: number; date?: string; expenseId?: number; salaryId?: number },
  ): Promise<PaymentDetails[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('paymentDetails')
      .leftJoinAndSelect('paymentDetails.expense', 'expense')
      .leftJoinAndSelect('paymentDetails.salary', 'salary')
      .leftJoinAndSelect('salary.staff', 'salaryStaff')
      .leftJoin('expense.clinic', 'expenseClinic')
      .where('(expenseClinic.id = :clinicId OR salaryStaff.clinicId = :clinicId)', {
        clinicId,
      });

    if (filters.id !== undefined)
      qb.andWhere('paymentDetails.id = :id', { id: filters.id });
    if (filters.date) qb.andWhere('paymentDetails.date = :date', { date: filters.date });
    if (filters.expenseId !== undefined) {
      qb.andWhere('expense.id = :expenseId', { expenseId: filters.expenseId });
    }
    if (filters.salaryId !== undefined) {
      qb.andWhere('salary.staffId = :salaryId', { salaryId: filters.salaryId });
    }
    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: { date?: string; cost?: number; expenseId?: number | null; salaryId?: number | null },
  ): Promise<PaymentDetails> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('paymentDetails')
      .leftJoinAndSelect('paymentDetails.expense', 'expense')
      .leftJoinAndSelect('paymentDetails.salary', 'salary')
      .leftJoinAndSelect('salary.staff', 'salaryStaff')
      .leftJoin('expense.clinic', 'expenseClinic')
      .where('paymentDetails.id = :id', { id })
      .andWhere('(expenseClinic.id = :clinicId OR salaryStaff.clinicId = :clinicId)', {
        clinicId,
      })
      .getOne();
    if (!existing) throw new Error('PaymentDetails not found');

    if (updates.expenseId !== undefined) {
      if (updates.expenseId === null) existing.expense = null;
      else {
        await this.ensureExpenseInClinic(updates.expenseId, clinicId);
        existing.expense = { id: updates.expenseId } as Expense;
      }
    }

    if (updates.salaryId !== undefined) {
      if (updates.salaryId === null) existing.salary = null;
      else {
        await this.ensureSalaryInClinic(updates.salaryId, clinicId);
        existing.salary = { staffId: updates.salaryId } as Salary;
      }
    }

    if (updates.date !== undefined) existing.date = updates.date;
    if (updates.cost !== undefined) existing.cost = updates.cost;

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('paymentDetails')
      .leftJoin('paymentDetails.expense', 'expense')
      .leftJoin('paymentDetails.salary', 'salary')
      .leftJoin('salary.staff', 'salaryStaff')
      .leftJoin('expense.clinic', 'expenseClinic')
      .where('paymentDetails.id = :id', { id })
      .andWhere('(expenseClinic.id = :clinicId OR salaryStaff.clinicId = :clinicId)', {
        clinicId,
      })
      .getOne();
    if (!existing) throw new Error('PaymentDetails not found');
    await this.repo.remove(existing);
  }
}
