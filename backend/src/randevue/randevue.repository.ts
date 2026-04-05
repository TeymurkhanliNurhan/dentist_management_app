import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Randevue } from './entities/randevue.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Appointment } from '../appointment/entities/appointment.entity';

@Injectable()
export class RandevueRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Randevue> {
        return this.dataSource.getRepository(Randevue);
    }

    async findForDentistOverlappingRange(dentistId: number, from: Date, to: Date): Promise<Randevue[]> {
        // Alias `pt` — not `patient` — avoids ambiguity with Randevue's FK column name `patient`.
        return this.repo
            .createQueryBuilder('r')
            .innerJoinAndSelect('r.patient', 'pt')
            .innerJoin('pt.dentist', 'dentist')
            .leftJoinAndSelect('r.appointment', 'appt')
            .where('dentist.id = :dentistId', { dentistId })
            .andWhere('r.date < :toBound', { toBound: to })
            .andWhere('r.endTime > :fromBound', { fromBound: from })
            .orderBy('r.date', 'ASC')
            .getMany();
    }

    async assertPatientOwnedByDentist(dentistId: number, patientId: number): Promise<Patient> {
        const patientRepo = this.dataSource.getRepository(Patient);
        const patient = await patientRepo.findOne({ where: { id: patientId }, relations: ['dentist'] });
        if (!patient) throw new Error('Patient not found');
        if (patient.dentist?.id !== dentistId) throw new Error('Forbidden patient');
        return patient;
    }

    async assertOpenAppointmentForPatient(
        dentistId: number,
        appointmentId: number,
        patientId: number,
    ): Promise<Appointment> {
        const apptRepo = this.dataSource.getRepository(Appointment);
        const appointment = await apptRepo.findOne({
            where: { id: appointmentId, dentist: { id: dentistId }, patient: { id: patientId } },
            relations: ['patient', 'dentist'],
        });
        if (!appointment) throw new Error('Appointment not found');
        if (appointment.endDate != null) throw new Error('Appointment already closed');
        return appointment;
    }

    async saveRandevue(input: {
        date: Date;
        endTime: Date;
        status: string;
        note: string | null;
        patient: Patient;
        appointment: Appointment | null;
    }): Promise<Randevue> {
        const row = this.repo.create({
            date: input.date,
            endTime: input.endTime,
            status: input.status,
            note: input.note,
            patient: input.patient,
            appointment: input.appointment,
        });
        return this.repo.save(row);
    }

    async findByIdWithRelations(id: number): Promise<Randevue | null> {
        return this.repo.findOne({
            where: { id },
            relations: ['patient', 'appointment'],
        });
    }
}
