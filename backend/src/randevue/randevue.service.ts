import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RandevueRepository } from './randevue.repository';
import { ApproveRandevueDto } from './dto/approve-randevue.dto';
import { CreateRandevueDto } from './dto/create-randevue.dto';
import { RejectRandevueDto } from './dto/reject-randevue.dto';
import { UpdateRandevueDto } from './dto/update-randevue.dto';
import { GetRandevueQueryDto } from './dto/get-randevue-query.dto';
import { AppointmentService } from '../appointment/appointment.service';
import { LogWriter } from '../log-writer';
import { Randevue } from './entities/randevue.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Room } from '../room/entities/room.entity';
import { Nurse } from '../nurse/entities/nurse.entity';
import { WhatsappNotificationService } from '../whatsapp/whatsapp-notification.service';
import type { PatientAuthContext } from '../auth/patient-access';

@Injectable()
export class RandevueService {
  private readonly logger = new Logger(RandevueService.name);

  constructor(
    private readonly repo: RandevueRepository,
    private readonly appointmentService: AppointmentService,
    private readonly whatsappNotifications: WhatsappNotificationService,
  ) {}

  private async resolveRoomForPatient(
    patient: Patient,
    roomId?: number,
  ): Promise<Room> {
    const clinicId = patient.clinic.id;
    if (roomId != null) {
      return await this.repo.assertRoomBelongsToClinic(roomId, clinicId);
    }
    const fallback = await this.repo.findDefaultGeneralRoomForClinic(clinicId);
    if (!fallback) {
      throw new BadRequestException(
        'No default room configured for this clinic',
      );
    }
    return fallback;
  }

  private async notifyIfBooked(randevue: Randevue | null): Promise<void> {
    if (!randevue || randevue.status !== 'booked') {
      return;
    }
    await this.whatsappNotifications.sendAppointmentConfirmed(randevue);
  }

  private formatAppointmentDate(d: Date | string | null | undefined): string | null {
    if (d == null) return null;
    const dt = d instanceof Date ? d : new Date(d as string);
    return dt.toISOString().slice(0, 10);
  }

  private trimNullable(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private toResponse(r: Randevue, opts?: { forPatient?: boolean }) {
    return {
      id: r.id,
      date:
        r.date instanceof Date
          ? r.date.toISOString()
          : new Date(r.date as unknown as string).toISOString(),
      endTime:
        r.endTime instanceof Date
          ? r.endTime.toISOString()
          : new Date(r.endTime as unknown as string).toISOString(),
      status: r.status,
      note: opts?.forPatient ? null : r.note,
      patientRequest: r.patientRequest,
      staffResponse: r.staffResponse,
      patient: r.patient
        ? {
            id: r.patient.id,
            name: r.patient.name,
            surname: r.patient.surname,
          }
        : undefined,
      appointment: r.appointment
        ? {
            id: r.appointment.id,
            startDate: this.formatAppointmentDate(r.appointment.startDate) ?? '',
            endDate: this.formatAppointmentDate(r.appointment.endDate),
          }
        : null,
      room: r.room
        ? {
            id: r.room.id,
            number: r.room.number,
            description: r.room.description,
          }
        : null,
      nurse: r.nurse
        ? {
            id: r.nurse.id,
            name: r.nurse.staff?.name ?? '',
            surname: r.nurse.staff?.surname ?? '',
          }
        : null,
      dentist: r.dentist
        ? {
            id: r.dentist.id,
            name: r.dentist.staff?.name ?? '',
            surname: r.dentist.staff?.surname ?? '',
          }
        : null,
    };
  }

  async findAll(
    dentistId: number,
    dto: GetRandevueQueryDto,
    userRole?: string,
  ) {
    if (!Number.isFinite(dentistId) || dentistId < 1) {
      throw new BadRequestException('Invalid dentist context');
    }
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (to <= from) {
      throw new BadRequestException('"to" must be after "from"');
    }
    const role = (userRole ?? '').toLowerCase();
    const list = await this.repo.findForDentistOverlappingRange(
      dentistId,
      from,
      to,
      {
        dentist: role === 'dentist' ? dentistId : dto.dentist,
        room: dto.room,
        nurse: dto.nurse,
        patient: dto.patient,
      },
    );
    const msg = `Dentist ${dentistId} listed ${list.length} randevue(s) for range`;
    this.logger.log(msg);
    LogWriter.append('log', RandevueService.name, msg);
    return list.map((r) => this.toResponse(r));
  }

  async findAllForPatient(context: PatientAuthContext, dto: GetRandevueQueryDto) {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (to <= from) {
      throw new BadRequestException('"to" must be after "from"');
    }
    const list = await this.repo.findForPatientOverlappingRange(
      context.patientId,
      context.clinicId,
      from,
      to,
    );
    const msg = `Patient ${context.patientId} listed ${list.length} randevue(s) for range`;
    this.logger.log(msg);
    LogWriter.append('log', RandevueService.name, msg);
    return list.map((r) => this.toResponse(r, { forPatient: true }));
  }

  async findClinicOccupancyForPatient(
    context: PatientAuthContext,
    dto: GetRandevueQueryDto,
  ) {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (to <= from) {
      throw new BadRequestException('"to" must be after "from"');
    }
    const rows = await this.repo.findOccupancyForClinic(
      context.clinicId,
      from,
      to,
    );
    const msg = `Patient ${context.patientId} listed ${rows.length} clinic occupancy slot(s)`;
    this.logger.log(msg);
    LogWriter.append('log', RandevueService.name, msg);
    return rows.map((row) => ({
      date:
        row.date instanceof Date
          ? row.date.toISOString()
          : new Date(row.date).toISOString(),
      endTime:
        row.endTime instanceof Date
          ? row.endTime.toISOString()
          : new Date(row.endTime).toISOString(),
      dentistId: row.dentistId,
    }));
  }

  async createForPatient(
    context: PatientAuthContext,
    dto: CreateRandevueDto,
  ) {
    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end datetime');
    }
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }
    if (dto.dentist_id == null) {
      throw new BadRequestException('Dentist is required');
    }
    if (dto.room_id != null) {
      throw new BadRequestException('Patients cannot choose a room');
    }
    if (dto.create_new_appointment && dto.appointment_id != null) {
      throw new BadRequestException(
        'Cannot set both create_new_appointment and appointment_id',
      );
    }
    if (dto.create_new_appointment === true && !dto.appointment_start_date) {
      throw new BadRequestException(
        'appointment_start_date is required when creating a new appointment',
      );
    }
    if (
      dto.patient_id != null &&
      dto.patient_id !== context.patientId
    ) {
      throw new BadRequestException('Invalid patient');
    }
    if (dto.nurse_id != null) {
      throw new BadRequestException('Nurse cannot be set by patients');
    }
    if (dto.tooth_treatment_ids?.length) {
      throw new BadRequestException(
        'Patients cannot link treatments when requesting a randevue',
      );
    }
    if (dto.note != null && dto.note.trim() !== '') {
      throw new BadRequestException('Patients cannot set staff note');
    }

    const patient = await this.repo.assertPatientInClinic(
      context.patientId,
      context.clinicId,
    );

    let linkedAppointmentId: number | null = null;
    if (dto.create_new_appointment === true) {
      const created = await this.appointmentService.createForPatientClinic(
        context.clinicId,
        {
          startDate: dto.appointment_start_date!,
          patient_id: context.patientId,
        },
      );
      linkedAppointmentId = created.id;
    } else if (dto.appointment_id != null) {
      await this.repo.assertOpenAppointmentForPatientInClinic(
        dto.appointment_id,
        context.patientId,
        context.clinicId,
      );
      linkedAppointmentId = dto.appointment_id;
    }

    const assignedDentist = await this.repo.assertDentistBelongsToClinic(
      dto.dentist_id,
      context.clinicId,
    );
    const patientRequest = this.trimNullable(dto.patient_request);

    try {
      const appointmentEntity =
        linkedAppointmentId != null
          ? ({ id: linkedAppointmentId } as Appointment)
          : null;

      const saved = await this.repo.saveRandevueWithRoomBlocking({
        date: start,
        endTime: end,
        status: 'requested',
        note: null,
        patientRequest,
        staffResponse: null,
        patient,
        appointment: appointmentEntity,
        room: null,
        nurse: null,
        dentistId: assignedDentist.id,
      });

      const reloaded = await this.repo.findByIdWithRelations(saved.id);
      if (!reloaded) throw new Error('Failed to load randevue');

      const msg = `Patient ${context.patientId} requested Randevue ${saved.id}`;
      this.logger.log(msg);
      LogWriter.append('log', RandevueService.name, msg);
      return this.toResponse(reloaded, { forPatient: true });
    } catch (e: any) {
      if (e?.message === 'Patient not found')
        throw new NotFoundException('Patient not found');
      if (e?.message === 'Appointment not found')
        throw new NotFoundException('Appointment not found');
      if (e?.message === 'Appointment already closed') {
        throw new BadRequestException(
          'That appointment is already closed (has an end date)',
        );
      }
      if (e?.message === 'Invalid room') {
        throw new BadRequestException('Room is not in this clinic');
      }
      if (e?.message === 'Invalid dentist') {
        throw new BadRequestException('Dentist is not in this clinic');
      }
      if (e?.message === 'Dentist is not working in this time range') {
        throw new BadRequestException(
          'Selected dentist is outside working hours for this time range',
        );
      }
      if (e?.message === 'Dentist already blocked') {
        throw new BadRequestException(
          'Selected dentist has blocking hours for this time range',
        );
      }
      if (e?.message === 'Dentist already has randevue in this time range') {
        throw new BadRequestException(
          'Selected dentist already has a randevue in this time range',
        );
      }
      if (e?.message === 'Room already has randevue in this time range') {
        throw new BadRequestException(
          'Selected room already has a randevue in this time range',
        );
      }
      this.logger.error(e?.stack || e?.message);
      throw new BadRequestException('Failed to request randevue');
    }
  }

  async create(dentistId: number, dto: CreateRandevueDto, userRole?: string) {
    if (!Number.isFinite(dentistId) || dentistId < 1) {
      throw new BadRequestException('Invalid dentist context');
    }
    if (dto.patient_id == null) {
      throw new BadRequestException('patient_id is required');
    }
    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end datetime');
    }
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    if (dto.create_new_appointment && dto.appointment_id != null) {
      throw new BadRequestException(
        'Cannot set both create_new_appointment and appointment_id',
      );
    }
    if (dto.create_new_appointment === true && !dto.appointment_start_date) {
      throw new BadRequestException(
        'appointment_start_date is required when creating a new appointment',
      );
    }

    const role = (userRole ?? '').toLowerCase();
    const isAdminLikeRole = role === 'director' || role === 'admin';
    if (isAdminLikeRole) {
      if (dto.room_id == null || dto.dentist_id == null || dto.nurse_id == null) {
        throw new BadRequestException(
          'Room, dentist, and nurse are required for admin when creating a randevue',
        );
      }
    } else if (dto.room_id == null || dto.dentist_id == null) {
      throw new BadRequestException(
        'Room and dentist are required when creating a randevue',
      );
    }

    if (role === 'dentist' && dto.dentist_id != null && dto.dentist_id !== dentistId) {
      throw new BadRequestException('You can only schedule randevues for yourself');
    }

    const patient = await this.repo.assertPatientOwnedByDentist(
      dentistId,
      dto.patient_id,
    );

    let linkedAppointmentId: number | null = null;
    let status: string;

    if (dto.create_new_appointment === true) {
      const created = await this.appointmentService.create(dentistId, {
        startDate: dto.appointment_start_date!,
        patient_id: dto.patient_id,
        chargedFee: 0,
      });
      linkedAppointmentId = created.id;
      status = 'booked';
    } else if (dto.appointment_id != null) {
      await this.repo.assertOpenAppointmentForPatient(
        dentistId,
        dto.appointment_id,
        dto.patient_id,
      );
      linkedAppointmentId = dto.appointment_id;
      status = 'booked';
    } else {
      status = 'scheduled';
    }

    const selectedTreatmentIds =
      dto.tooth_treatment_ids?.filter((id) => Number.isFinite(id) && id > 0) ?? [];
    if (selectedTreatmentIds.length > 0 && linkedAppointmentId == null) {
      throw new BadRequestException(
        'tooth_treatment_ids requires appointment_id or create_new_appointment',
      );
    }

    const note = this.trimNullable(dto.note);

    try {
      const appointmentEntity =
        linkedAppointmentId != null
          ? ({ id: linkedAppointmentId } as Appointment)
          : null;

      const assignedDentist =
        dto.dentist_id != null
          ? await this.repo.assertDentistBelongsToClinic(
              dto.dentist_id,
              patient.clinic.id,
            )
          : ({ id: dentistId } as Dentist);
      const room = await this.resolveRoomForPatient(patient, dto.room_id);
      let nurse: Nurse | null = null;
      if (dto.nurse_id != null) {
        nurse = await this.repo.assertNurseBelongsToClinic(
          dto.nurse_id,
          patient.clinic.id,
        );
      }

      const saved = await this.repo.saveRandevueWithRoomBlocking({
        date: start,
        endTime: end,
        status,
        note,
        patientRequest: null,
        staffResponse: null,
        patient,
        appointment: appointmentEntity,
        room,
        nurse,
        dentistId: assignedDentist.id,
      });

      if (selectedTreatmentIds.length > 0) {
        await this.repo.linkToothTreatmentsToRandevue({
          treatmentIds: selectedTreatmentIds,
          appointmentId: linkedAppointmentId!,
          patientId: dto.patient_id,
          randevueId: saved.id,
        });
      }

      const reloaded = await this.repo.findByIdWithRelations(saved.id);
      if (!reloaded) throw new Error('Failed to load randevue');

      const msg = `Dentist ${dentistId} created Randevue ${saved.id}`;
      this.logger.log(msg);
      LogWriter.append('log', RandevueService.name, msg);
      await this.notifyIfBooked(reloaded);
      return this.toResponse(reloaded);
    } catch (e: any) {
      if (e?.message?.includes('Forbidden patient')) {
        throw new BadRequestException("You don't have such a patient");
      }
      if (e?.message === 'Patient not found')
        throw new NotFoundException('Patient not found');
      if (e?.message === 'Appointment not found')
        throw new NotFoundException('Appointment not found');
      if (e?.message === 'Appointment already closed') {
        throw new BadRequestException(
          'That appointment is already closed (has an end date)',
        );
      }
      if (e?.message === 'Invalid room') {
        throw new BadRequestException('Room is not in this clinic');
      }
      if (e?.message === 'Room already blocked') {
        throw new BadRequestException(
          'Room already has a blocking interval for this time range',
        );
      }
      if (e?.message === 'Invalid dentist') {
        throw new BadRequestException('Dentist is not in this clinic');
      }
      if (e?.message === 'Invalid nurse') {
        throw new BadRequestException('Nurse is not in this clinic');
      }
      if (e?.message === 'Dentist is not working in this time range') {
        throw new BadRequestException(
          'Selected dentist is outside working hours for this time range',
        );
      }
      if (e?.message === 'Nurse is not working in this time range') {
        throw new BadRequestException(
          'Selected nurse is outside working hours for this time range',
        );
      }
      if (e?.message === 'Dentist already blocked') {
        throw new BadRequestException(
          'Selected dentist has blocking hours for this time range',
        );
      }
      if (e?.message === 'Nurse already blocked') {
        throw new BadRequestException(
          'Selected nurse has blocking hours for this time range',
        );
      }
      if (e?.message === 'Dentist already has randevue in this time range') {
        throw new BadRequestException(
          'Selected dentist already has a randevue in this time range',
        );
      }
      if (e?.message === 'Nurse already has randevue in this time range') {
        throw new BadRequestException(
          'Selected nurse already has a randevue in this time range',
        );
      }
      if (e?.message === 'Room already has randevue in this time range') {
        throw new BadRequestException(
          'Selected room already has a randevue in this time range',
        );
      }
      if (e?.message === 'Invalid randevue treatments') {
        throw new BadRequestException(
          'Selected treatments are not valid for this appointment and patient',
        );
      }
      if (e?.message === 'No tooth data for selected treatments') {
        throw new BadRequestException(
          'Selected treatments do not have tooth rows to link with randevue',
        );
      }
      this.logger.error(e?.stack || e?.message);
      throw new BadRequestException('Failed to create randevue');
    }
  }

  async update(
    dentistId: number,
    id: number,
    dto: UpdateRandevueDto,
    userRole?: string,
  ) {
    if (!Number.isFinite(dentistId) || dentistId < 1) {
      throw new BadRequestException('Invalid dentist context');
    }
    const role = (userRole ?? '').toLowerCase();
    const isAdminLikeRole = role === 'director' || role === 'admin';
    const row = isAdminLikeRole
      ? await this.repo.findByIdInClinic(dentistId, id)
      : await this.repo.findByIdForDentist(dentistId, id);
    if (!row) throw new NotFoundException('Randevue not found');

    const previousStatus = row.status;

    if (role === 'dentist' && dto.dentist_id != null && dto.dentist_id !== dentistId) {
      throw new BadRequestException('You can only assign randevues to yourself');
    }
    const originalPatientId = row.patient.id;

    let start =
      row.date instanceof Date
        ? row.date
        : new Date(row.date as unknown as string);
    let end =
      row.endTime instanceof Date
        ? row.endTime
        : new Date(row.endTime as unknown as string);

    if (dto.startDateTime != null) {
      const s = new Date(dto.startDateTime);
      if (Number.isNaN(s.getTime()))
        throw new BadRequestException('Invalid start datetime');
      start = s;
    }
    if (dto.endDateTime != null) {
      const e = new Date(dto.endDateTime);
      if (Number.isNaN(e.getTime()))
        throw new BadRequestException('Invalid end datetime');
      end = e;
    }
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    row.date = start;
    row.endTime = end;

    if (dto.patient_id != null && dto.patient_id !== row.patient.id) {
      const patient = await this.repo.assertPatientOwnedByDentist(
        dentistId,
        dto.patient_id,
      );
      const appt = row.appointment;
      if (appt && appt.patient && appt.patient.id !== patient.id) {
        row.appointment = null;
        if (row.status === 'booked') row.status = 'scheduled';
      }
      row.patient = patient;
      row.dentist = { id: dentistId } as Dentist;
    }

    if (dto.dentist_id != null) {
      row.dentist = await this.repo.assertDentistBelongsToClinic(
        dto.dentist_id,
        row.patient.clinic.id,
      );
    }

    if (dto.note !== undefined) {
      const trimmed = dto.note.trim();
      row.note = trimmed === '' ? null : trimmed;
    }

    const wantsClear = dto.clear_appointment === true;
    const wantsLink = dto.appointment_id != null;
    const wantsNew = dto.create_new_appointment === true;
    const apptIntentCount = [wantsClear, wantsLink, wantsNew].filter(
      Boolean,
    ).length;
    if (apptIntentCount > 1) {
      throw new BadRequestException(
        'Only one of clear_appointment, appointment_id, or create_new_appointment is allowed',
      );
    }
    if (dto.create_new_appointment === true && dto.appointment_id != null) {
      throw new BadRequestException(
        'Cannot set both create_new_appointment and appointment_id',
      );
    }
    if (wantsClear) {
      row.appointment = null;
      if (row.status === 'booked') row.status = 'scheduled';
    } else if (wantsNew) {
      if (!dto.appointment_start_date) {
        throw new BadRequestException(
          'appointment_start_date is required when creating a new appointment',
        );
      }
      const created = await this.appointmentService.create(dentistId, {
        startDate: dto.appointment_start_date,
        patient_id: row.patient.id,
        chargedFee: 0,
      });
      row.appointment = { id: created.id } as Appointment;
      row.status = 'booked';
    } else if (wantsLink) {
      await this.repo.assertOpenAppointmentForPatient(
        dentistId,
        dto.appointment_id!,
        row.patient.id,
      );
      row.appointment = { id: dto.appointment_id! } as Appointment;
      row.status = 'booked';
    }

    if (dto.clear_nurse === true && dto.nurse_id != null) {
      throw new BadRequestException('Cannot set both clear_nurse and nurse_id');
    }

    const appendTreatmentIds =
      dto.append_tooth_treatment_ids?.filter(
        (value) => Number.isFinite(value) && value > 0,
      ) ?? [];
    const removeTreatmentIds =
      dto.remove_tooth_treatment_ids?.filter(
        (value) => Number.isFinite(value) && value > 0,
      ) ?? [];
    if (
      (appendTreatmentIds.length > 0 || removeTreatmentIds.length > 0) &&
      row.appointment == null
    ) {
      throw new BadRequestException(
        'This randevue is not linked to an appointment',
      );
    }

    const clinicId = row.patient.clinic.id;
    if (dto.room_id != null) {
      row.room = await this.repo.assertRoomBelongsToClinic(
        dto.room_id,
        clinicId,
      );
    } else if (dto.patient_id != null && dto.patient_id !== originalPatientId) {
      row.room = await this.resolveRoomForPatient(row.patient);
    }

    if (dto.clear_nurse === true) {
      row.nurse = null;
    } else if (dto.nurse_id != null) {
      row.nurse = await this.repo.assertNurseBelongsToClinic(
        dto.nurse_id,
        row.patient.clinic.id,
      );
    } else if (dto.patient_id != null && dto.patient_id !== originalPatientId) {
      row.nurse = null;
    }

    if (row.status !== 'requested' && (!row.room || !row.dentist)) {
      throw new BadRequestException(
        'Room and dentist are required unless status is requested',
      );
    }

    try {
      await this.repo.saveEntity(row);
      if (appendTreatmentIds.length > 0) {
        await this.repo.linkToothTreatmentsToRandevue({
          treatmentIds: appendTreatmentIds,
          appointmentId: row.appointment!.id,
          patientId: row.patient.id,
          randevueId: row.id,
        });
      }
      if (removeTreatmentIds.length > 0) {
        await this.repo.unlinkToothTreatmentsFromRandevue({
          treatmentIds: removeTreatmentIds,
          appointmentId: row.appointment!.id,
          patientId: row.patient.id,
          randevueId: row.id,
        });
      }
      const reloaded = isAdminLikeRole
        ? await this.repo.findByIdInClinic(dentistId, id)
        : await this.repo.findByIdForDentist(dentistId, id);
      if (!reloaded) throw new Error('Failed to reload randevue');
      const msg = `Dentist ${dentistId} updated Randevue ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', RandevueService.name, msg);
      if (previousStatus !== 'booked' && reloaded.status === 'booked') {
        await this.notifyIfBooked(reloaded);
      }
      return this.toResponse(reloaded);
    } catch (e: any) {
      if (e?.message?.includes('Forbidden patient')) {
        throw new BadRequestException("You don't have such a patient");
      }
      if (e?.message === 'Patient not found')
        throw new NotFoundException('Patient not found');
      if (e?.message === 'Appointment not found')
        throw new NotFoundException('Appointment not found');
      if (e?.message === 'Appointment already closed') {
        throw new BadRequestException(
          'That appointment is already closed (has an end date)',
        );
      }
      if (e?.message === 'Invalid room') {
        throw new BadRequestException('Room is not in this clinic');
      }
      if (e?.message === 'Invalid dentist') {
        throw new BadRequestException('Dentist is not in this clinic');
      }
      if (e?.message === 'Invalid nurse') {
        throw new BadRequestException('Nurse is not in this clinic');
      }
      if (e?.message === 'Invalid randevue treatments') {
        throw new BadRequestException(
          'Selected treatments are not valid for this appointment and patient',
        );
      }
      if (e?.message === 'No tooth data for selected treatments') {
        throw new BadRequestException(
          'Selected treatments do not have tooth rows to link with randevue',
        );
      }
      this.logger.error(e?.stack || e?.message);
      throw new BadRequestException('Failed to update randevue');
    }
  }

  async approve(
    dentistId: number,
    id: number,
    dto: ApproveRandevueDto,
    userRole?: string,
  ) {
    if (!Number.isFinite(dentistId) || dentistId < 1) {
      throw new BadRequestException('Invalid dentist context');
    }
    const role = (userRole ?? '').toLowerCase();
    const isAdminLikeRole = role === 'director' || role === 'admin';
    const row = isAdminLikeRole
      ? await this.repo.findByIdInClinic(dentistId, id)
      : await this.repo.findByIdForDentist(dentistId, id);
    if (!row) throw new NotFoundException('Randevue not found');
    if (row.status !== 'requested') {
      throw new BadRequestException('Only requested randevues can be approved');
    }
    if (!row.dentist?.id) {
      throw new BadRequestException('Dentist is required to approve this randevue');
    }

    const clinicId = row.patient.clinic.id;
    const room = await this.resolveRoomForPatient(
      row.patient,
      dto.room_id ?? row.room?.id,
    );
    let nurse: Nurse | null = row.nurse;
    if (dto.nurse_id != null) {
      nurse = await this.repo.assertNurseBelongsToClinic(dto.nurse_id, clinicId);
    }

    const nextStatus = row.appointment != null ? 'booked' : 'scheduled';
    const staffResponse = this.trimNullable(dto.staff_response);

    try {
      const saved = await this.repo.confirmRequestedRandevue({
        randevueId: row.id,
        date:
          row.date instanceof Date
            ? row.date
            : new Date(row.date as unknown as string),
        endTime:
          row.endTime instanceof Date
            ? row.endTime
            : new Date(row.endTime as unknown as string),
        status: nextStatus,
        note: row.note,
        patientRequest: row.patientRequest,
        staffResponse,
        patient: row.patient,
        appointment: row.appointment,
        room,
        nurse,
        dentistId: row.dentist.id,
      });

      const reloaded = await this.repo.findByIdWithRelations(saved.id);
      if (!reloaded) throw new Error('Failed to load randevue');

      const msg = `Staff ${dentistId} approved Randevue ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', RandevueService.name, msg);
      await this.notifyIfBooked(reloaded);
      return this.toResponse(reloaded);
    } catch (e: any) {
      if (e?.message === 'Invalid room') {
        throw new BadRequestException('Room is not in this clinic');
      }
      if (e?.message === 'Invalid dentist') {
        throw new BadRequestException('Dentist is not in this clinic');
      }
      if (e?.message === 'Invalid nurse') {
        throw new BadRequestException('Nurse is not in this clinic');
      }
      if (e?.message === 'Dentist is not working in this time range') {
        throw new BadRequestException(
          'Selected dentist is outside working hours for this time range',
        );
      }
      if (e?.message === 'Room already blocked') {
        throw new BadRequestException(
          'Room already has a blocking interval for this time range',
        );
      }
      if (e?.message === 'Dentist already blocked') {
        throw new BadRequestException(
          'Selected dentist has blocking hours for this time range',
        );
      }
      if (e?.message === 'Room already has randevue in this time range') {
        throw new BadRequestException(
          'Selected room already has a randevue in this time range',
        );
      }
      if (e?.message === 'Dentist already has randevue in this time range') {
        throw new BadRequestException(
          'Selected dentist already has a randevue in this time range',
        );
      }
      this.logger.error(e?.stack || e?.message);
      throw new BadRequestException('Failed to approve randevue');
    }
  }

  async reject(
    dentistId: number,
    id: number,
    dto: RejectRandevueDto,
    userRole?: string,
  ) {
    if (!Number.isFinite(dentistId) || dentistId < 1) {
      throw new BadRequestException('Invalid dentist context');
    }
    const role = (userRole ?? '').toLowerCase();
    const isAdminLikeRole = role === 'director' || role === 'admin';
    const row = isAdminLikeRole
      ? await this.repo.findByIdInClinic(dentistId, id)
      : await this.repo.findByIdForDentist(dentistId, id);
    if (!row) throw new NotFoundException('Randevue not found');
    if (row.status !== 'requested') {
      throw new BadRequestException('Only requested randevues can be rejected');
    }

    row.status = 'rejected';
    row.staffResponse = this.trimNullable(dto.staff_response);
    try {
      await this.repo.saveEntity(row);
      const reloaded = isAdminLikeRole
        ? await this.repo.findByIdInClinic(dentistId, id)
        : await this.repo.findByIdForDentist(dentistId, id);
      if (!reloaded) throw new Error('Failed to reload randevue');

      const msg = `Staff ${dentistId} rejected Randevue ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', RandevueService.name, msg);
      return this.toResponse(reloaded);
    } catch (e: any) {
      this.logger.error(e?.stack || e?.message);
      throw new BadRequestException('Failed to reject randevue');
    }
  }

  async delete(dentistId: number, id: number, userRole?: string) {
    if (!Number.isFinite(dentistId) || dentistId < 1) {
      throw new BadRequestException('Invalid dentist context');
    }
    const role = (userRole ?? '').toLowerCase();
    const hasClinicWideScope =
      role === 'director' || role === 'admin' || role === 'frontdesk';
    const row = hasClinicWideScope
      ? await this.repo.findByIdInClinic(dentistId, id)
      : await this.repo.findByIdForDentist(dentistId, id);
    if (!row) throw new NotFoundException('Randevue not found');

    try {
      await this.repo.deleteById(id);
      const msg = `Dentist ${dentistId} deleted Randevue ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', RandevueService.name, msg);
      return { id };
    } catch (e: any) {
      this.logger.error(e?.stack || e?.message);
      throw new BadRequestException('Failed to delete randevue');
    }
  }
}
