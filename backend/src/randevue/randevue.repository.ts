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
import { BlockingHours } from '../blocking_hours/entities/blocking_hours.entity';
import { WorkingHours } from '../working_hours/entities/working_hours.entity';

@Injectable()
export class RandevueRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Working hours are stored as clinic-local wall clock time.
   * Convert UTC instants to clinic-local timeline before weekday/time checks.
   * Default is UTC+4 (Baku); can be overridden via env.
   */
  private readonly clinicTimezoneOffsetMinutes = Number.parseInt(
    process.env.CLINIC_TIMEZONE_OFFSET_MINUTES ?? '240',
    10,
  );

  private toClinicLocal(date: Date): Date {
    return new Date(date.getTime() + this.clinicTimezoneOffsetMinutes * 60_000);
  }

  private toApiDayOfWeek(date: Date): number {
    const clinicLocal = this.toClinicLocal(date);
    const day = clinicLocal.getUTCDay();
    return day === 0 ? 7 : day;
  }

  private toTimeString(date: Date): string {
    const clinicLocal = this.toClinicLocal(date);
    const hh = String(clinicLocal.getUTCHours()).padStart(2, '0');
    const mm = String(clinicLocal.getUTCMinutes()).padStart(2, '0');
    const ss = String(clinicLocal.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private get repo(): Repository<Randevue> {
    return this.dataSource.getRepository(Randevue);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff?.clinicId) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  async findDefaultGeneralRoomForClinic(
    clinicId: number,
  ): Promise<Room | null> {
    return this.dataSource.getRepository(Room).findOne({
      where: { clinicId, description: GENERAL_DENTISTRY_ROOM_DESCRIPTION },
      order: { id: 'ASC' },
    });
  }

  async assertRoomBelongsToClinic(
    roomId: number,
    clinicId: number,
  ): Promise<Room> {
    const room = await this.dataSource.getRepository(Room).findOne({
      where: { id: roomId, clinicId },
    });
    if (!room) throw new Error('Invalid room');
    return room;
  }

  async assertNurseBelongsToClinic(
    nurseId: number,
    clinicId: number,
  ): Promise<Nurse> {
    const nurse = await this.dataSource.getRepository(Nurse).findOne({
      where: { id: nurseId },
      relations: ['staff'],
    });
    if (!nurse?.staff || nurse.staff.clinicId !== clinicId)
      throw new Error('Invalid nurse');
    return nurse;
  }

  async assertDentistBelongsToClinic(
    dentistId: number,
    clinicId: number,
  ): Promise<Dentist> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff || dentist.staff.clinicId !== clinicId)
      throw new Error('Invalid dentist');
    return dentist;
  }

  async findForDentistOverlappingRange(
    dentistId: number,
    from: Date,
    to: Date,
    filters?: {
      dentist?: number;
      room?: number;
      nurse?: number;
      patient?: number;
    },
  ): Promise<Randevue[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.patient', 'pt')
      .innerJoinAndSelect('pt.clinic', 'ptclinic')
      .leftJoinAndSelect('r.appointment', 'appt')
      .leftJoinAndSelect('r.room', 'rm')
      .leftJoinAndSelect('r.nurse', 'nv')
      .leftJoinAndSelect('r.dentist', 'rdentist')
      .where('ptclinic.id = :clinicId', { clinicId })
      .andWhere('r.date < :toBound', { toBound: to })
      .andWhere('r.endTime > :fromBound', { fromBound: from });

    if (filters?.dentist != null) {
      qb.andWhere('rdentist.id = :filterDentistId', {
        filterDentistId: filters.dentist,
      });
    }
    if (filters?.room != null) {
      qb.andWhere('rm.id = :filterRoomId', { filterRoomId: filters.room });
    }
    if (filters?.nurse != null) {
      qb.andWhere('nv.id = :filterNurseId', { filterNurseId: filters.nurse });
    }
    if (filters?.patient != null) {
      qb.andWhere('pt.id = :filterPatientId', { filterPatientId: filters.patient });
    }

    return qb.orderBy('r.date', 'ASC').getMany();
  }

  async assertPatientOwnedByDentist(
    dentistId: number,
    patientId: number,
  ): Promise<Patient> {
    const patientRepo = this.dataSource.getRepository(Patient);
    const dentistRepo = this.dataSource.getRepository(Dentist);
    const [patient, dentist] = await Promise.all([
      patientRepo.findOne({ where: { id: patientId }, relations: ['clinic'] }),
      dentistRepo.findOne({ where: { id: dentistId }, relations: ['staff'] }),
    ]);
    if (!patient?.clinic) throw new Error('Patient not found');
    if (!dentist?.staff) throw new Error('Forbidden patient');
    if (patient.clinic.id !== dentist.staff.clinicId)
      throw new Error('Forbidden patient');
    return patient;
  }

  async assertOpenAppointmentForPatient(
    dentistId: number,
    appointmentId: number,
    patientId: number,
  ): Promise<Appointment> {
    const apptRepo = this.dataSource.getRepository(Appointment);
    const dentist = await this.dataSource
      .getRepository(Dentist)
      .findOne({ where: { id: dentistId }, relations: ['staff'] });
    if (!dentist?.staff) throw new Error('Forbidden appointment');

    const appointment = await apptRepo.findOne({
      where: {
        id: appointmentId,
        clinicId: dentist.staff.clinicId,
        patient: { id: patientId },
      },
      relations: ['patient'],
    });
    if (!appointment) throw new Error('Appointment not found');
    if (appointment.endDate != null)
      throw new Error('Appointment already closed');
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
    dentistId: number;
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
      dentist: { id: input.dentistId } as Dentist,
    });
    return this.repo.save(row);
  }

  async saveRandevueWithRoomBlocking(input: {
    date: Date;
    endTime: Date;
    status: string;
    note: string | null;
    patient: Patient;
    appointment: Appointment | null;
    room: Room;
    nurse: Nurse | null;
    dentistId: number;
  }): Promise<Randevue> {
    return await this.dataSource.transaction(async (manager) => {
      const dayOfWeek = this.toApiDayOfWeek(input.date);
      const startTime = this.toTimeString(input.date);
      const endTime = this.toTimeString(input.endTime);

      const assignedDentist = await manager.getRepository(Dentist).findOne({
        where: { id: input.dentistId },
      });
      if (!assignedDentist) {
        throw new Error('Invalid dentist');
      }
      const dentistStaffId = assignedDentist.staffId;

      const hasDentistWorkingHours = await manager
        .getRepository(WorkingHours)
        .createQueryBuilder('wh')
        .where('wh.staffId = :staffId', { staffId: dentistStaffId })
        .andWhere('wh.dayOfWeek = :dayOfWeek', { dayOfWeek })
        .andWhere('wh.startTime <= :startTime', { startTime })
        .andWhere('wh.endTime >= :endTime', { endTime })
        .getExists();
      if (!hasDentistWorkingHours) {
        throw new Error('Dentist is not working in this time range');
      }

      if (input.nurse != null) {
        const assignedNurse = await manager.getRepository(Nurse).findOne({
          where: { id: input.nurse.id },
        });
        if (!assignedNurse) {
          throw new Error('Invalid nurse');
        }

        const hasNurseWorkingHours = await manager
          .getRepository(WorkingHours)
          .createQueryBuilder('wh')
          .where('wh.staffId = :staffId', { staffId: assignedNurse.staffId })
          .andWhere('wh.dayOfWeek = :dayOfWeek', { dayOfWeek })
          .andWhere('wh.startTime <= :startTime', { startTime })
          .andWhere('wh.endTime >= :endTime', { endTime })
          .getExists();
        if (!hasNurseWorkingHours) {
          throw new Error('Nurse is not working in this time range');
        }
      }

      const blockingRepo = manager.getRepository(BlockingHours);
      const roomBlockingOverlap = await blockingRepo
        .createQueryBuilder('bh')
        .where('bh.roomId = :roomId', { roomId: input.room.id })
        .andWhere('bh.startTime < :endTime', { endTime: input.endTime })
        .andWhere('bh.endTime > :startTime', { startTime: input.date })
        .getOne();
      if (roomBlockingOverlap) {
        throw new Error('Room already blocked');
      }

      const dentistBlockingOverlap = await blockingRepo
        .createQueryBuilder('bh')
        .where('bh.staffId = :staffId', { staffId: dentistStaffId })
        .andWhere('bh.startTime < :endTime', { endTime: input.endTime })
        .andWhere('bh.endTime > :startTime', { startTime: input.date })
        .getOne();
      if (dentistBlockingOverlap) {
        throw new Error('Dentist already blocked');
      }

      if (input.nurse != null) {
        const nurseBlockingOverlap = await blockingRepo
          .createQueryBuilder('bh')
          .where('bh.staffId = :staffId', { staffId: input.nurse.staffId })
          .andWhere('bh.startTime < :endTime', { endTime: input.endTime })
          .andWhere('bh.endTime > :startTime', { startTime: input.date })
          .getOne();
        if (nurseBlockingOverlap) {
          throw new Error('Nurse already blocked');
        }
      }

      const randevueRepo = manager.getRepository(Randevue);
      const overlappingRoomRandevue = await randevueRepo
        .createQueryBuilder('r')
        .innerJoin('r.room', 'rm')
        .where('rm.id = :roomId', { roomId: input.room.id })
        .andWhere('r.date < :endTime', { endTime: input.endTime })
        .andWhere('r.endTime > :startTime', { startTime: input.date })
        .getOne();
      if (overlappingRoomRandevue) {
        throw new Error('Room already has randevue in this time range');
      }

      const overlappingDentistRandevue = await randevueRepo
        .createQueryBuilder('r')
        .innerJoin('r.dentist', 'd')
        .where('d.id = :dentistId', { dentistId: input.dentistId })
        .andWhere('r.date < :endTime', { endTime: input.endTime })
        .andWhere('r.endTime > :startTime', { startTime: input.date })
        .getOne();
      if (overlappingDentistRandevue) {
        throw new Error('Dentist already has randevue in this time range');
      }

      if (input.nurse != null) {
        const overlappingNurseRandevue = await randevueRepo
          .createQueryBuilder('r')
          .innerJoin('r.nurse', 'n')
          .where('n.id = :nurseId', { nurseId: input.nurse.id })
          .andWhere('r.date < :endTime', { endTime: input.endTime })
          .andWhere('r.endTime > :startTime', { startTime: input.date })
          .getOne();
        if (overlappingNurseRandevue) {
          throw new Error('Nurse already has randevue in this time range');
        }
      }

      const row = manager.getRepository(Randevue).create({
        date: input.date,
        endTime: input.endTime,
        status: input.status,
        note: input.note,
        patient: input.patient,
        appointment: input.appointment,
        room: input.room,
        nurse: input.nurse,
        dentist: { id: input.dentistId } as Dentist,
      });
      const saved = await manager.getRepository(Randevue).save(row);

      return saved;
    });
  }

  async findByIdWithRelations(id: number): Promise<Randevue | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['patient', 'appointment', 'room', 'nurse', 'dentist'],
    });
  }

  async findByIdForDentist(
    dentistId: number,
    id: number,
  ): Promise<Randevue | null> {
    return this.repo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.patient', 'pt')
      .innerJoinAndSelect('pt.clinic', 'ptclinic')
      .leftJoinAndSelect('r.appointment', 'appt')
      .leftJoinAndSelect('appt.patient', 'apptPt')
      .leftJoinAndSelect('r.room', 'rm')
      .leftJoinAndSelect('r.nurse', 'nv')
      .leftJoinAndSelect('r.dentist', 'rdentist')
      .where('r.id = :id', { id })
      .andWhere('r.dentist = :dentistId', { dentistId })
      .getOne();
  }

  async findByIdInClinic(dentistId: number, id: number): Promise<Randevue | null> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    return this.repo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.patient', 'pt')
      .innerJoinAndSelect('pt.clinic', 'ptclinic')
      .leftJoinAndSelect('r.appointment', 'appt')
      .leftJoinAndSelect('appt.patient', 'apptPt')
      .leftJoinAndSelect('r.room', 'rm')
      .leftJoinAndSelect('r.nurse', 'nv')
      .leftJoinAndSelect('r.dentist', 'rdentist')
      .where('r.id = :id', { id })
      .andWhere('ptclinic.id = :clinicId', { clinicId })
      .getOne();
  }

  async saveEntity(entity: Randevue): Promise<Randevue> {
    return this.repo.save(entity);
  }
}
