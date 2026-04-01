import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ToothTreatment } from './entities/tooth_treatment.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Treatment } from '../treatment/entities/treatment.entity';
import { PatientTooth } from '../patient_tooth/entities/patient_tooth.entity';

@Injectable()
export class ToothTreatmentRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<ToothTreatment> {
        return this.dataSource.getRepository(ToothTreatment);
    }

    async createForDentist(
        dentistId: number,
        input: { appointmentId: number; treatmentId: number; patientId: number; toothIds: number[]; description: string | null },
    ): Promise<ToothTreatment> {
        const appointmentRepo = this.dataSource.getRepository(Appointment);
        const treatmentRepo = this.dataSource.getRepository(Treatment);
        const ptRepo = this.dataSource.getRepository(PatientTooth);

        const appointment = await appointmentRepo.findOne({ where: { id: input.appointmentId }, relations: ['dentist', 'patient'] });
        if (!appointment) throw new Error('Appointment not found');
        if (appointment.dentist?.id !== dentistId) throw new Error('Forbidden');
        if (appointment.patient?.id !== input.patientId) throw new Error('InvalidPatientForAppointment');

        const treatment = await treatmentRepo.findOne({ where: { id: input.treatmentId, dentist: { id: dentistId } } });
        if (!treatment) throw new Error('Treatment not found or not owned');

        for (const toothId of input.toothIds) {
            const patientTooth = await ptRepo.findOne({ where: { patient: input.patientId, tooth: toothId } });
            if (!patientTooth) throw new Error(`PatientTooth not found for tooth ${toothId}`);
        }

        const created = this.repo.create({
            appointment,
            treatment,
            patientTooth: null,
            patient: input.patientId,
            tooth: null,
            description: input.description,
        });
        return await this.repo.save(created);
    }

    async updateEnsureOwnership(
        dentistId: number,
        id: number,
        updates: Partial<{ treatmentId: number; description: string | null }>,
    ): Promise<ToothTreatment> {
        const current = await this.repo.findOne({ where: { id }, relations: ['appointment', 'appointment.dentist', 'patientTooth'] });
        if (!current) throw new Error('ToothTreatment not found');
        if (current.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');

        if (updates.treatmentId !== undefined) {
            const treatment = await this.dataSource.getRepository(Treatment).findOne({ where: { id: updates.treatmentId, dentist: { id: dentistId } } });
            if (!treatment) throw new Error('Treatment not found or not owned');
            current.treatment = treatment;
        }
        if (updates.description !== undefined) current.description = updates.description;
        return await this.repo.save(current);
    }

    async deleteEnsureOwnership(dentistId: number, id: number): Promise<void> {
        const current = await this.repo.findOne({ where: { id }, relations: ['appointment', 'appointment.dentist'] });
        if (!current) throw new Error('ToothTreatment not found');
        if (current.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');
        await this.repo.remove(current);
    }

    async findToothTreatmentsForDentist(
        dentistId: number,
        filters: { id?: number; appointment?: number; tooth?: number; patient?: number; treatment?: number },
    ): Promise<ToothTreatment[]> {
        const queryBuilder = this.repo
            .createQueryBuilder('toothTreatment')
            .leftJoinAndSelect('toothTreatment.appointment', 'appointment')
            .leftJoinAndSelect('toothTreatment.treatment', 'treatment')
            .leftJoinAndSelect('toothTreatment.patientTooth', 'patientTooth')
            .leftJoinAndSelect('toothTreatment.toothTreatmentTeeth', 'toothTreatmentTeeth')
            .leftJoinAndSelect('toothTreatmentTeeth.patientTooth', 'tttPatientTooth')
            .leftJoinAndSelect('appointment.patient', 'appointmentPatient')
            .where('appointment.dentist = :dentistId', { dentistId });

        if (filters.id !== undefined) {
            queryBuilder.andWhere('toothTreatment.id = :id', { id: filters.id });
        }
        if (filters.appointment !== undefined) {
            queryBuilder.andWhere('toothTreatment.appointment = :appointment', { appointment: filters.appointment });
        }
        if (filters.tooth !== undefined) {
            queryBuilder.andWhere('toothTreatment.tooth = :tooth', { tooth: filters.tooth });
        }
        if (filters.patient !== undefined) {
            queryBuilder.andWhere('toothTreatment.patient = :patient', { patient: filters.patient });
        }
        if (filters.treatment !== undefined) {
            queryBuilder.andWhere('toothTreatment.treatment = :treatment', { treatment: filters.treatment });
        }

        return await queryBuilder.getMany();
    }
}



