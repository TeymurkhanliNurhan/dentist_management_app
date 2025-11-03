import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ToothTreatmentMedicine } from './entities/tooth_treatment_medicine.entity';
import { ToothTreatment } from '../tooth_treatment/entities/tooth_treatment.entity';
import { Medicine } from '../medicine/entities/medicine.entity';

@Injectable()
export class ToothTreatmentMedicineRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<ToothTreatmentMedicine> {
        return this.dataSource.getRepository(ToothTreatmentMedicine);
    }

    async createForDentist(dentistId: number, toothTreatmentId: number, medicineId: number): Promise<ToothTreatmentMedicine> {
        const ttRepo = this.dataSource.getRepository(ToothTreatment);
        const medRepo = this.dataSource.getRepository(Medicine);

        const toothTreatment = await ttRepo.findOne({ where: { id: toothTreatmentId }, relations: ['appointment', 'appointment.dentist'] });
        if (!toothTreatment) throw new Error('ToothTreatment not found');
        if (toothTreatment.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');

        const medicine = await medRepo.findOne({ where: { id: medicineId, dentist: { id: dentistId } } });
        if (!medicine) throw new Error('Medicine not found or not owned');

        const existing = await this.repo.findOne({ where: { medicine: medicineId, toothTreatment: toothTreatmentId } });
        if (existing) throw new Error('Already exists');

        const created = this.repo.create({
            medicine: medicineId,
            toothTreatment: toothTreatmentId,
            medicineEntity: medicine,
            toothTreatmentEntity: toothTreatment,
        });
        return await this.repo.save(created);
    }

    async deleteEnsureOwnership(dentistId: number, toothTreatmentId: number, medicineId: number): Promise<void> {
        const ttRepo = this.dataSource.getRepository(ToothTreatment);
        const toothTreatment = await ttRepo.findOne({ where: { id: toothTreatmentId }, relations: ['appointment', 'appointment.dentist'] });
        if (!toothTreatment) throw new Error('ToothTreatment not found');
        if (toothTreatment.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');

        const existing = await this.repo.findOne({ where: { medicine: medicineId, toothTreatment: toothTreatmentId } });
        if (!existing) throw new Error('ToothTreatmentMedicine not found');

        await this.repo.remove(existing);
    }

    async findToothTreatmentMedicinesForDentist(
        dentistId: number,
        filters: { medicine?: number; toothTreatment?: number },
    ): Promise<ToothTreatmentMedicine[]> {
        const queryBuilder = this.repo
            .createQueryBuilder('ttm')
            .leftJoinAndSelect('ttm.toothTreatmentEntity', 'toothTreatment')
            .leftJoinAndSelect('toothTreatment.appointment', 'appointment')
            .leftJoinAndSelect('appointment.dentist', 'dentist')
            .where('dentist.id = :dentistId', { dentistId });

        if (filters.medicine !== undefined) {
            queryBuilder.andWhere('ttm.medicine = :medicine', { medicine: filters.medicine });
        }
        if (filters.toothTreatment !== undefined) {
            queryBuilder.andWhere('ttm.toothTreatment = :toothTreatment', { toothTreatment: filters.toothTreatment });
        }

        return await queryBuilder.getMany();
    }
}

