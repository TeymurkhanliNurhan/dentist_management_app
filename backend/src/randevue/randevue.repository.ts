import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Randevue } from './entities/randevue.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

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
            .innerJoin('pt.clinic', 'pclinic')
            .innerJoin(Dentist, 'dentist', 'dentist.id = :dentistId', { dentistId })
            .innerJoin('dentist.staff', 'dstaff')
            .leftJoinAndSelect('r.appointment', 'appt')
            .where('pclinic.id = dstaff.clinicId')
            .andWhere('r.date < :toBound', { toBound: to })
            .andWhere('r.endTime > :fromBound', { fromBound: from })
            .orderBy('r.date', 'ASC')
            .getMany();
    }

    async assertPatientOwnedByDentist(dentistId: number, patientId: number): Promise<Patient> {
        const patientRepo = this.dataSource.getRepository(Patient);
        const dentistRepo = this.dataSource.getRepository(Dentist);
        const [patient, dentist] = await Promise.all([
            patientRepo.findOne({ where: { id: patientId }, relations: ['clinic'] }),
            dentistRepo.findOne({ where: { id: dentistId }, relations: ['staff'] }),
        ]);
        if (!patient?.clinic) throw new Error('Patient not found');
        if (!dentist?.staff) throw new Error('Forbidden patient');
        if (patient.clinic.id !== dentist.staff.clinicId) throw new Error('Forbidden patient');
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

    async findByIdForDentist(dentistId: number, id: number): Promise<Randevue | null> {
        return this.repo
            .createQueryBuilder('r')
            .innerJoinAndSelect('r.patient', 'pt')
            .innerJoin('pt.clinic', 'pclinic')
            .innerJoin(Dentist, 'dentist', 'dentist.id = :dentistId', { dentistId })
            .innerJoin('dentist.staff', 'dstaff')
            .leftJoinAndSelect('r.appointment', 'appt')
            .leftJoinAndSelect('appt.patient', 'apptPt')
            .where('r.id = :id', { id })
            .andWhere('pclinic.id = dstaff.clinicId')
            .getOne();
    }

    async saveEntity(entity: Randevue): Promise<Randevue> {
        return this.repo.save(entity);
    }
}
