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

    async updateEnsureOwnership(dentistId: number, toothTreatmentId: number, oldMedicineId: number, newMedicineId: number): Promise<ToothTreatmentMedicine> {
        const ttRepo = this.dataSource.getRepository(ToothTreatment);
        const medRepo = this.dataSource.getRepository(Medicine);

        const toothTreatment = await ttRepo.findOne({ where: { id: toothTreatmentId }, relations: ['appointment', 'appointment.dentist'] });
        if (!toothTreatment) throw new Error('ToothTreatment not found');
        if (toothTreatment.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');

        const existing = await this.repo.findOne({ where: { medicine: oldMedicineId, toothTreatment: toothTreatmentId } });
        if (!existing) throw new Error('ToothTreatmentMedicine not found');

        const newMedicine = await medRepo.findOne({ where: { id: newMedicineId, dentist: { id: dentistId } } });
        if (!newMedicine) throw new Error('Medicine not found or not owned');

        await this.repo.remove(existing);

        const created = this.repo.create({
            medicine: newMedicineId,
            toothTreatment: toothTreatmentId,
            medicineEntity: newMedicine,
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
}

