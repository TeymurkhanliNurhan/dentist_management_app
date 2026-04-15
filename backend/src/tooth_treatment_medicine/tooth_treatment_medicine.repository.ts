import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ToothTreatmentMedicine } from './entities/tooth_treatment_medicine.entity';
import { ToothTreatment } from '../tooth_treatment/entities/tooth_treatment.entity';
import { Medicine } from '../medicine/entities/medicine.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import {
  calculateAppointmentCalculatedFee,
  calculateAppointmentDiscountFee,
} from '../appointment/appointment-fee.util';

@Injectable()
export class ToothTreatmentMedicineRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<ToothTreatmentMedicine> {
    return this.dataSource.getRepository(ToothTreatmentMedicine);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource
      .getRepository(Dentist)
      .findOne({ where: { id: dentistId }, relations: ['staff'] });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  private async refreshAppointmentFees(appointmentId: number): Promise<void> {
    const appointmentRepo = this.dataSource.getRepository(Appointment);
    const appointment = await appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: [
        'toothTreatments',
        'toothTreatments.treatment',
        'toothTreatments.toothTreatmentMedicines',
        'toothTreatments.toothTreatmentMedicines.medicineEntity',
      ],
    });

    if (!appointment) return;

    appointment.calculatedFee = calculateAppointmentCalculatedFee(appointment);
    appointment.discountFee = calculateAppointmentDiscountFee(
      appointment.calculatedFee,
      appointment.chargedFee,
    );
    await appointmentRepo.save(appointment);
  }

  async createForDentist(
    dentistId: number,
    toothTreatmentId: number,
    medicineId: number,
    quantity = 1,
  ): Promise<ToothTreatmentMedicine> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);
    const medRepo = this.dataSource.getRepository(Medicine);

    const toothTreatment = await ttRepo.findOne({
      where: { id: toothTreatmentId },
      relations: ['appointment'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (toothTreatment.appointment?.clinicId !== clinicId) throw new Error('Forbidden');

    const medicine = await medRepo.findOne({
      where: { id: medicineId, clinic: { id: clinicId } },
    });
    if (!medicine) throw new Error('Medicine not found or not owned');

    const existing = await this.repo.findOne({
      where: { medicine: medicineId, toothTreatment: toothTreatmentId },
    });
    if (existing) {
      existing.quantity += quantity;
      const updated = await this.repo.save(existing);
      await this.refreshAppointmentFees(toothTreatment.appointment.id);
      return updated;
    }

    const created = this.repo.create({
      medicine: medicineId,
      toothTreatment: toothTreatmentId,
      medicinePriceSnapshot: medicine.price,
      quantity,
      medicineEntity: medicine,
      toothTreatmentEntity: toothTreatment,
    });
    const saved = await this.repo.save(created);
    await this.refreshAppointmentFees(toothTreatment.appointment.id);
    return saved;
  }

  async updateQuantityEnsureOwnership(
    dentistId: number,
    toothTreatmentId: number,
    medicineId: number,
    quantity: number,
  ): Promise<ToothTreatmentMedicine> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);
    const toothTreatment = await ttRepo.findOne({
      where: { id: toothTreatmentId },
      relations: ['appointment'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (toothTreatment.appointment?.clinicId !== clinicId) throw new Error('Forbidden');

    const existing = await this.repo.findOne({
      where: { medicine: medicineId, toothTreatment: toothTreatmentId },
    });
    if (!existing) throw new Error('ToothTreatmentMedicine not found');

    existing.quantity = quantity;
    const updated = await this.repo.save(existing);
    await this.refreshAppointmentFees(toothTreatment.appointment.id);
    return updated;
  }

  async deleteEnsureOwnership(
    dentistId: number,
    toothTreatmentId: number,
    medicineId: number,
  ): Promise<void> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);
    const toothTreatment = await ttRepo.findOne({
      where: { id: toothTreatmentId },
      relations: ['appointment'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (toothTreatment.appointment?.clinicId !== clinicId) throw new Error('Forbidden');

    const existing = await this.repo.findOne({
      where: { medicine: medicineId, toothTreatment: toothTreatmentId },
    });
    if (!existing) throw new Error('ToothTreatmentMedicine not found');

    await this.repo.remove(existing);
    await this.refreshAppointmentFees(toothTreatment.appointment.id);
  }

  async findToothTreatmentMedicinesForDentist(
    dentistId: number,
    filters: { medicine?: number; toothTreatment?: number },
  ): Promise<ToothTreatmentMedicine[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const queryBuilder = this.repo
      .createQueryBuilder('ttm')
      .leftJoinAndSelect('ttm.medicineEntity', 'medicine')
      .leftJoinAndSelect('ttm.toothTreatmentEntity', 'toothTreatment')
      .leftJoinAndSelect('toothTreatment.appointment', 'appointment')
      .where('appointment.clinicId = :clinicId', { clinicId });

    if (filters.medicine !== undefined) {
      queryBuilder.andWhere('ttm.medicine = :medicine', {
        medicine: filters.medicine,
      });
    }
    if (filters.toothTreatment !== undefined) {
      queryBuilder.andWhere('ttm.toothTreatment = :toothTreatment', {
        toothTreatment: filters.toothTreatment,
      });
    }

    return await queryBuilder.getMany();
  }
}
