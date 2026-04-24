import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaymentDetails } from './entities/payment_details.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Expense } from '../expense/entities/expense.entity';
import { Salary } from '../salary/entities/salary.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { ToothTreatment } from '../tooth_treatment/entities/tooth_treatment.entity';

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
    filters: {
      id?: number;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
      expenseId?: number;
      salaryId?: number;
    },
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
    if (filters.date) {
      qb.andWhere("to_char(paymentDetails.date, 'YYYY-MM-DD') = :singleDate", {
        singleDate: filters.date,
      });
    } else {
      if (filters.dateFrom) {
        qb.andWhere('paymentDetails.date >= :dateFrom', { dateFrom: filters.dateFrom });
      }
      if (filters.dateTo) {
        qb.andWhere('paymentDetails.date <= :dateTo', { dateTo: filters.dateTo });
      }
    }
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

  async getFinanceOverviewForDentist(
    dentistId: number,
    filters: { year?: number; month?: number },
  ) {
    const clinicId = await this.getClinicIdForDentist(dentistId);

    const now = new Date();
    const year = filters.year ?? now.getFullYear();
    const month = filters.month ?? now.getMonth() + 1;

    const appointmentRepo = this.dataSource.getRepository(Appointment);
    const toothTreatmentRepo = this.dataSource.getRepository(ToothTreatment);

    const incomeRaw = await appointmentRepo
      .createQueryBuilder('appointment')
      .select('COALESCE(SUM(appointment.calculatedFee), 0)', 'total')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('EXTRACT(YEAR FROM appointment.startDate) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM appointment.startDate) = :month', { month })
      .getRawOne<{ total: string }>();

    const debtRaw = await appointmentRepo
      .createQueryBuilder('appointment')
      .select('COALESCE(SUM(appointment.discountFee), 0)', 'total')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('EXTRACT(YEAR FROM appointment.startDate) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM appointment.startDate) = :month', { month })
      .getRawOne<{ total: string }>();

    const salaries = await this.dataSource
      .getRepository(Salary)
      .createQueryBuilder('salary')
      .innerJoinAndSelect('salary.staff', 'staff')
      .where('staff.clinicId = :clinicId', { clinicId })
      .getMany();

    const salaryBreakdown: Array<{
      staffId: number;
      name: string;
      surname: string;
      role: string | null;
      amount: number;
      type: 'percentage' | 'fixed';
      percentage: number | null;
      treatmentCost: number | null;
    }> = [];
    let totalSalaryOutcome = 0;

    const incomeByDentistRaw = await toothTreatmentRepo
      .createQueryBuilder('toothTreatment')
      .innerJoin('toothTreatment.appointment', 'appointment')
      .innerJoin('toothTreatment.dentist', 'dentist')
      .innerJoin('dentist.staff', 'staff')
      .select('staff.id', 'staffId')
      .addSelect('staff.name', 'name')
      .addSelect('staff.surname', 'surname')
      .addSelect('COALESCE(SUM(toothTreatment.feeSnapshot), 0)', 'amount')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('EXTRACT(YEAR FROM appointment.startDate) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM appointment.startDate) = :month', { month })
      .groupBy('staff.id')
      .addGroupBy('staff.name')
      .addGroupBy('staff.surname')
      .orderBy('COALESCE(SUM(toothTreatment.feeSnapshot), 0)', 'DESC')
      .getRawMany<{
        staffId: string;
        name: string;
        surname: string;
        amount: string;
      }>();

    for (const salary of salaries) {
      const staff = salary.staff;
      const isDentist = (staff.role ?? '').toLowerCase() === 'dentist';
      const hasPercentage =
        salary.treatmentPercentage !== null && salary.treatmentPercentage !== undefined;

      if (isDentist && hasPercentage) {
        const treatmentRaw = await toothTreatmentRepo
          .createQueryBuilder('toothTreatment')
          .innerJoin('toothTreatment.appointment', 'appointment')
          .innerJoin('toothTreatment.dentist', 'dentist')
          .select('COALESCE(SUM(toothTreatment.feeSnapshot), 0)', 'totalTreatmentCost')
          .where('appointment.clinicId = :clinicId', { clinicId })
          .andWhere('dentist.staffId = :staffId', { staffId: staff.id })
          .andWhere('EXTRACT(YEAR FROM appointment.startDate) = :year', { year })
          .andWhere('EXTRACT(MONTH FROM appointment.startDate) = :month', { month })
          .getRawOne<{ totalTreatmentCost: string }>();

        const totalTreatmentCost = Number(treatmentRaw?.totalTreatmentCost ?? 0);
        const amount = (totalTreatmentCost * (salary.treatmentPercentage ?? 0)) / 100;
        totalSalaryOutcome += amount;
        salaryBreakdown.push({
          staffId: staff.id,
          name: staff.name,
          surname: staff.surname,
          role: staff.role,
          amount,
          type: 'percentage',
          percentage: salary.treatmentPercentage,
          treatmentCost: totalTreatmentCost,
        });
      } else {
        const amount = Number(salary.salary ?? 0);
        totalSalaryOutcome += amount;
        salaryBreakdown.push({
          staffId: staff.id,
          name: staff.name,
          surname: staff.surname,
          role: staff.role,
          amount,
          type: 'fixed',
          percentage: null,
          treatmentCost: null,
        });
      }
    }

    const monthlyPaymentDetails = await this.repo
      .createQueryBuilder('paymentDetails')
      .leftJoinAndSelect('paymentDetails.expense', 'expense')
      .leftJoinAndSelect(
        'paymentDetails.purchaseMedicineRecords',
        'purchaseMedicineRecords',
      )
      .leftJoinAndSelect('purchaseMedicineRecords.medicine', 'purchaseMedicineMedicine')
      .leftJoin('purchaseMedicineMedicine.clinic', 'purchaseMedicineClinic')
      .where('paymentDetails.salary IS NULL')
      .andWhere('EXTRACT(YEAR FROM paymentDetails.date) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM paymentDetails.date) = :month', { month })
      .andWhere(
        '(expense.clinicId = :clinicId OR purchaseMedicineClinic.id = :clinicId)',
        { clinicId },
      )
      .orderBy('paymentDetails.date', 'DESC')
      .getMany();

    const otherPaymentsByCategory = new Map<string, number>();
    for (const paymentDetail of monthlyPaymentDetails) {
      const category = paymentDetail.expense?.name ?? 'Other';
      otherPaymentsByCategory.set(
        category,
        (otherPaymentsByCategory.get(category) ?? 0) + Number(paymentDetail.cost ?? 0),
      );
    }

    const purchaseMedicines = monthlyPaymentDetails.flatMap(
      (paymentDetail) => paymentDetail.purchaseMedicineRecords ?? [],
    );

    const medicinePurchasesByName = new Map<string, number>();
    for (const purchase of purchaseMedicines) {
      const medicineName = purchase.medicine?.name ?? 'Unknown medicine';
      medicinePurchasesByName.set(
        medicineName,
        (medicinePurchasesByName.get(medicineName) ?? 0) + Number(purchase.totalPrice ?? 0),
      );
    }

    const totalOtherPaymentDetails = monthlyPaymentDetails.reduce(
      (acc, item) => acc + Number(item.cost ?? 0),
      0,
    );
    const totalMedicinePurchases = purchaseMedicines.reduce(
      (acc, item) => acc + Number(item.totalPrice ?? 0),
      0,
    );
    const totalOutcome = totalSalaryOutcome + totalOtherPaymentDetails + totalMedicinePurchases;

    return {
      period: { year, month },
      monthlyIncome: Number(incomeRaw?.total ?? 0),
      debt: Number(debtRaw?.total ?? 0),
      incomeBreakdown: {
        byDentists: incomeByDentistRaw.map((row) => ({
          staffId: Number(row.staffId),
          name: row.name,
          surname: row.surname,
          amount: Number(row.amount ?? 0),
        })),
      },
      outcome: {
        total: totalOutcome,
        totalSalaries: totalSalaryOutcome,
        totalOtherPaymentDetails,
        totalMedicinePurchases,
        salaries: salaryBreakdown,
        medicinePurchases: {
          total: totalMedicinePurchases,
          byMedicine: Array.from(medicinePurchasesByName.entries()).map(
            ([medicineName, totalCost]) => ({
              medicineName,
              totalCost,
            }),
          ),
          items: purchaseMedicines.map((item) => ({
            id: item.id,
            date: item.paymentDetails?.date ?? null,
            medicineId: item.medicine?.id ?? null,
            medicineName: item.medicine?.name ?? null,
            count: item.count,
            pricePerOne: item.pricePerOne,
            totalPrice: item.totalPrice,
          })),
        },
      },
      otherPaymentDetails: {
        total: totalOtherPaymentDetails,
        byCategory: Array.from(otherPaymentsByCategory.entries()).map(
          ([name, totalCost]) => ({
            name,
            totalCost,
          }),
        ),
        items: monthlyPaymentDetails.map((item) => ({
          id: item.id,
          date: item.date,
          cost: item.cost,
          expenseId: item.expense?.id ?? null,
          expenseName: item.expense?.name ?? null,
          purchaseMedicines: (item.purchaseMedicineRecords ?? []).map((purchase) => ({
            id: purchase.id,
            medicineName: purchase.medicine?.name ?? null,
            count: purchase.count,
            totalPrice: purchase.totalPrice,
          })),
        })),
      },
    };
  }
}
