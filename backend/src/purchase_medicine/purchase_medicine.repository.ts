import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PurchaseMedicine } from './entities/purchase_medicine.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Medicine } from '../medicine/entities/medicine.entity';
import { PaymentDetails } from '../payment_details/entities/payment_details.entity';

@Injectable()
export class PurchaseMedicineRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<PurchaseMedicine> {
    return this.dataSource.getRepository(PurchaseMedicine);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  private async ensureMedicineInClinic(medicineId: number, clinicId: number) {
    const medicine = await this.dataSource
      .getRepository(Medicine)
      .createQueryBuilder('medicine')
      .innerJoin('medicine.clinic', 'clinic')
      .where('medicine.id = :medicineId', { medicineId })
      .andWhere('clinic.id = :clinicId', { clinicId })
      .getOne();
    if (!medicine) throw new Error('Medicine not found');
    return medicine;
  }

  private async ensurePaymentDetailsInClinic(
    paymentDetailsId: number,
    clinicId: number,
  ) {
    const paymentDetails = await this.dataSource
      .getRepository(PaymentDetails)
      .createQueryBuilder('paymentDetails')
      .leftJoin('paymentDetails.expense', 'expense')
      .leftJoin('paymentDetails.salary', 'salary')
      .leftJoin('salary.staff', 'salaryStaff')
      .leftJoin('expense.clinic', 'expenseClinic')
      .where('paymentDetails.id = :paymentDetailsId', { paymentDetailsId })
      .andWhere('(expenseClinic.id = :clinicId OR salaryStaff.clinicId = :clinicId)', {
        clinicId,
      })
      .getOne();
    if (!paymentDetails) throw new Error('PaymentDetails not found');
  }

  async createForDentist(
    dentistId: number,
    input: {
      medicineId: number;
      count: number;
      pricePerOne: number;
      totalPrice: number;
      paymentDetailsId: number;
    },
  ) {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    await this.ensureMedicineInClinic(input.medicineId, clinicId);
    await this.ensurePaymentDetailsInClinic(input.paymentDetailsId, clinicId);

    const created = this.repo.create({
      medicine: { id: input.medicineId } as Medicine,
      count: input.count,
      pricePerOne: input.pricePerOne,
      totalPrice: input.totalPrice,
      paymentDetails: { id: input.paymentDetailsId } as PaymentDetails,
    });
    return await this.repo.save(created);
  }

  async createSessionForDentist(
    dentistId: number,
    input: {
      items: {
        medicineId: number;
        count: number;
        pricePerOne: number;
      }[];
    },
  ) {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const paymentDetailsRepo = queryRunner.manager.getRepository(PaymentDetails);
      const purchaseRepo = queryRunner.manager.getRepository(PurchaseMedicine);
      const medicineRepo = queryRunner.manager.getRepository(Medicine);

      const paymentDetails = await paymentDetailsRepo.save(
        paymentDetailsRepo.create({
          date: new Date().toISOString().slice(0, 10),
          salary: null,
          expense: null,
          cost: 0,
        }),
      );

      let cost = 0;
      const purchaseMedicines: PurchaseMedicine[] = [];

      for (const item of input.items) {
        await this.ensureMedicineInClinic(item.medicineId, clinicId);
        const totalPrice = item.count * item.pricePerOne;
        const created = await purchaseRepo.save(
          purchaseRepo.create({
            medicine: { id: item.medicineId } as Medicine,
            count: item.count,
            pricePerOne: item.pricePerOne,
            totalPrice,
            paymentDetails: { id: paymentDetails.id } as PaymentDetails,
          }),
        );
        purchaseMedicines.push(created);
        cost += totalPrice;

        await medicineRepo.increment({ id: item.medicineId }, 'stock', item.count);
        await medicineRepo.update(item.medicineId, {
          purchasePrice: item.pricePerOne,
        });
      }

      paymentDetails.cost = cost;
      await paymentDetailsRepo.save(paymentDetails);

      await queryRunner.commitTransaction();
      return {
        paymentDetails,
        purchaseMedicines,
        totalCost: cost,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findForDentist(
    dentistId: number,
    filters: { id?: number; medicineId?: number; paymentDetailsId?: number },
  ) {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('purchaseMedicine')
      .innerJoinAndSelect('purchaseMedicine.medicine', 'medicine')
      .innerJoinAndSelect('purchaseMedicine.paymentDetails', 'paymentDetails')
      .leftJoin('paymentDetails.expense', 'expense')
      .leftJoin('paymentDetails.salary', 'salary')
      .leftJoin('salary.staff', 'salaryStaff')
      .leftJoin('expense.clinic', 'expenseClinic')
      .leftJoin('medicine.clinic', 'medicineClinic')
      .where('medicineClinic.id = :clinicId', { clinicId })
      .andWhere('(expenseClinic.id = :clinicId OR salaryStaff.clinicId = :clinicId)', {
        clinicId,
      });

    if (filters.id !== undefined)
      qb.andWhere('purchaseMedicine.id = :id', { id: filters.id });
    if (filters.medicineId !== undefined) {
      qb.andWhere('medicine.id = :medicineId', { medicineId: filters.medicineId });
    }
    if (filters.paymentDetailsId !== undefined) {
      qb.andWhere('paymentDetails.id = :paymentDetailsId', {
        paymentDetailsId: filters.paymentDetailsId,
      });
    }
    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: {
      medicineId?: number;
      count?: number;
      pricePerOne?: number;
      totalPrice?: number;
      paymentDetailsId?: number;
    },
  ) {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('purchaseMedicine')
      .innerJoinAndSelect('purchaseMedicine.medicine', 'medicine')
      .innerJoinAndSelect('purchaseMedicine.paymentDetails', 'paymentDetails')
      .leftJoin('medicine.clinic', 'medicineClinic')
      .leftJoin('paymentDetails.expense', 'expense')
      .leftJoin('paymentDetails.salary', 'salary')
      .leftJoin('salary.staff', 'salaryStaff')
      .leftJoin('expense.clinic', 'expenseClinic')
      .where('purchaseMedicine.id = :id', { id })
      .andWhere('medicineClinic.id = :clinicId', { clinicId })
      .andWhere('(expenseClinic.id = :clinicId OR salaryStaff.clinicId = :clinicId)', {
        clinicId,
      })
      .getOne();
    if (!existing) throw new Error('PurchaseMedicine not found');

    if (updates.medicineId !== undefined) {
      await this.ensureMedicineInClinic(updates.medicineId, clinicId);
      existing.medicine = { id: updates.medicineId } as Medicine;
    }
    if (updates.paymentDetailsId !== undefined) {
      await this.ensurePaymentDetailsInClinic(updates.paymentDetailsId, clinicId);
      existing.paymentDetails = { id: updates.paymentDetailsId } as PaymentDetails;
    }
    if (updates.count !== undefined) existing.count = updates.count;
    if (updates.pricePerOne !== undefined) existing.pricePerOne = updates.pricePerOne;
    if (updates.totalPrice !== undefined) existing.totalPrice = updates.totalPrice;

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('purchaseMedicine')
      .innerJoin('purchaseMedicine.medicine', 'medicine')
      .leftJoin('medicine.clinic', 'medicineClinic')
      .where('purchaseMedicine.id = :id', { id })
      .andWhere('medicineClinic.id = :clinicId', { clinicId })
      .getOne();
    if (!existing) throw new Error('PurchaseMedicine not found');
    await this.repo.remove(existing);
  }
}
