import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Randevue } from './entities/randevue.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Room } from '../room/entities/room.entity';
import { Nurse } from '../nurse/entities/nurse.entity';
import { GENERAL_DENTISTRY_ROOM_DESCRIPTION } from './randevue.constants';

@Injectable()
export class RandevueRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Randevue> {
        return this.dataSource.getRepository(Randevue);
    }

    async findDefaultGeneralRoomForClinic(clinicId: number): Promise<Room | null> {
        return this.dataSource.getRepository(Room).findOne({
            where: { clinicId, description: GENERAL_DENTISTRY_ROOM_DESCRIPTION },
            order: { id: 'ASC' },
        });
    }

    async assertRoomBelongsToClinic(roomId: number, clinicId: number): Promise<Room> {
        const room = await this.dataSource.getRepository(Room).findOne({
            where: { id: roomId, clinicId },
        });
        if (!room) throw new Error('Invalid room');
        return room;
    }

    async assertNurseBelongsToClinic(nurseId: number, clinicId: number): Promise<Nurse> {
        const nurse = await this.dataSource.getRepository(Nurse).findOne({
            where: { id: nurseId },
            relations: ['staff'],
        });
        if (!nurse?.staff || nurse.staff.clinicId !== clinicId) throw new Error('Invalid nurse');
        return nurse;
    }

    async findForDentistOverlappingRange(dentistId: number, from: Date, to: Date): Promise<Randevue[]> {
        return this.repo
            .createQueryBuilder('r')
            .innerJoinAndSelect('r.patient', 'pt')
            .innerJoinAndSelect('pt.clinic', 'ptclinic')
            .innerJoin(Dentist, 'dentist', 'dentist.id = :dentistId', { dentistId })
            .innerJoin('dentist.staff', 'dstaff')
            .leftJoinAndSelect('r.appointment', 'appt')
            .leftJoinAndSelect('r.room', 'rm')
            .leftJoinAndSelect('r.nurse', 'nv')
            .where('ptclinic.id = dstaff.clinicId')
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
        room: Room;
        nurse: Nurse | null;
    }): Promise<Randevue> {
        const row = this.repo.create({
            date: input.date,
            endTime: input.endTime,
            status: input.status,
            note: input.note,
            patient: input.patient,
            appointment: input.appointment,
            room: input.room,
            nurse: input.nurse,
        });
        return this.repo.save(row);
    }

    async findByIdWithRelations(id: number): Promise<Randevue | null> {
        return this.repo.findOne({
            where: { id },
            relations: ['patient', 'appointment', 'room', 'nurse'],
        });
    }

    async findByIdForDentist(dentistId: number, id: number): Promise<Randevue | null> {
        return this.repo
            .createQueryBuilder('r')
            .innerJoinAndSelect('r.patient', 'pt')
            .innerJoinAndSelect('pt.clinic', 'ptclinic')
            .innerJoin(Dentist, 'dentist', 'dentist.id = :dentistId', { dentistId })
            .innerJoin('dentist.staff', 'dstaff')
            .leftJoinAndSelect('r.appointment', 'appt')
            .leftJoinAndSelect('appt.patient', 'apptPt')
            .leftJoinAndSelect('r.room', 'rm')
            .leftJoinAndSelect('r.nurse', 'nv')
            .where('r.id = :id', { id })
            .andWhere('ptclinic.id = dstaff.clinicId')
            .getOne();
    }

    async saveEntity(entity: Randevue): Promise<Randevue> {
        return this.repo.save(entity);
    }
}
