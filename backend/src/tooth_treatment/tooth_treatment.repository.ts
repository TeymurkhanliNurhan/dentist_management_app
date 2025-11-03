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
        input: { appointmentId: number; treatmentId: number; patientId: number; toothId: number; description: string | null },
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

        const patientTooth = await ptRepo.findOne({ where: { patient: input.patientId, tooth: input.toothId } });
        if (!patientTooth) throw new Error('PatientTooth not found');

        const created = this.repo.create({
            appointment,
            treatment,
            patientTooth,
            patient: input.patientId,
            tooth: input.toothId,
            description: input.description,
        });
        return await this.repo.save(created);
    }

    async updateEnsureOwnership(
        dentistId: number,
        id: number,
        updates: Partial<{ treatmentId: number; toothId: number; description: string | null }>,
    ): Promise<ToothTreatment> {
        const current = await this.repo.findOne({ where: { id }, relations: ['appointment', 'appointment.dentist', 'patientTooth'] });
        if (!current) throw new Error('ToothTreatment not found');
        if (current.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');

        if (updates.treatmentId !== undefined) {
            const treatment = await this.dataSource.getRepository(Treatment).findOne({ where: { id: updates.treatmentId, dentist: { id: dentistId } } });
            if (!treatment) throw new Error('Treatment not found or not owned');
            current.treatment = treatment;
        }
        if (updates.toothId !== undefined) {
            const patientId = current.patient;
            const ptRepo = this.dataSource.getRepository(PatientTooth);
            const patientTooth = await ptRepo.findOne({ where: { patient: patientId, tooth: updates.toothId } });
            if (!patientTooth) throw new Error('PatientTooth not found');
            current.patientTooth = patientTooth;
            current.tooth = updates.toothId;
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
}



