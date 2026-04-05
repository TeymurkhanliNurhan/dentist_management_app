import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RandevueRepository } from './randevue.repository';
import { CreateRandevueDto } from './dto/create-randevue.dto';
import { UpdateRandevueDto } from './dto/update-randevue.dto';
import { GetRandevueQueryDto } from './dto/get-randevue-query.dto';
import { AppointmentService } from '../appointment/appointment.service';
import { LogWriter } from '../log-writer';
import { Randevue } from './entities/randevue.entity';
import { Appointment } from '../appointment/entities/appointment.entity';

@Injectable()
export class RandevueService {
    private readonly logger = new Logger(RandevueService.name);

    constructor(
        private readonly repo: RandevueRepository,
        private readonly appointmentService: AppointmentService,
    ) {}

    private toResponse(r: Randevue) {
        return {
            id: r.id,
            date: r.date instanceof Date ? r.date.toISOString() : new Date(r.date as unknown as string).toISOString(),
            endTime: r.endTime instanceof Date ? r.endTime.toISOString() : new Date(r.endTime as unknown as string).toISOString(),
            status: r.status,
            note: r.note,
            patient: r.patient
                ? {
                      id: r.patient.id,
                      name: r.patient.name,
                      surname: r.patient.surname,
                  }
                : undefined,
            appointment: r.appointment ? { id: r.appointment.id } : null,
        };
    }

    async findAll(dentistId: number, dto: GetRandevueQueryDto) {
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
        const list = await this.repo.findForDentistOverlappingRange(dentistId, from, to);
        const msg = `Dentist ${dentistId} listed ${list.length} randevue(s) for range`;
        this.logger.log(msg);
        LogWriter.append('log', RandevueService.name, msg);
        return list.map((r) => this.toResponse(r));
    }

    async create(dentistId: number, dto: CreateRandevueDto) {
        if (!Number.isFinite(dentistId) || dentistId < 1) {
            throw new BadRequestException('Invalid dentist context');
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
            throw new BadRequestException('Cannot set both create_new_appointment and appointment_id');
        }
        if (dto.create_new_appointment === true && !dto.appointment_start_date) {
            throw new BadRequestException('appointment_start_date is required when creating a new appointment');
        }

        const patient = await this.repo.assertPatientOwnedByDentist(dentistId, dto.patient_id);

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
            await this.repo.assertOpenAppointmentForPatient(dentistId, dto.appointment_id, dto.patient_id);
            linkedAppointmentId = dto.appointment_id;
            status = 'booked';
        } else {
            status = 'scheduled';
        }

        const note = dto.note != null && dto.note.trim() !== '' ? dto.note.trim() : null;

        try {
            const appointmentEntity = linkedAppointmentId != null ? ({ id: linkedAppointmentId } as Appointment) : null;

            const saved = await this.repo.saveRandevue({
                date: start,
                endTime: end,
                status,
                note,
                patient,
                appointment: appointmentEntity,
            });

            const reloaded = await this.repo.findByIdWithRelations(saved.id);
            if (!reloaded) throw new Error('Failed to load randevue');

            const msg = `Dentist ${dentistId} created Randevue ${saved.id}`;
            this.logger.log(msg);
            LogWriter.append('log', RandevueService.name, msg);
            return this.toResponse(reloaded);
        } catch (e: any) {
            if (e?.message?.includes('Forbidden patient')) {
                throw new BadRequestException("You don't have such a patient");
            }
            if (e?.message === 'Patient not found') throw new NotFoundException('Patient not found');
            if (e?.message === 'Appointment not found') throw new NotFoundException('Appointment not found');
            if (e?.message === 'Appointment already closed') {
                throw new BadRequestException('That appointment is already closed (has an end date)');
            }
            this.logger.error(e?.stack || e?.message);
            throw new BadRequestException('Failed to create randevue');
        }
    }

    async update(dentistId: number, id: number, dto: UpdateRandevueDto) {
        if (!Number.isFinite(dentistId) || dentistId < 1) {
            throw new BadRequestException('Invalid dentist context');
        }
        const row = await this.repo.findByIdForDentist(dentistId, id);
        if (!row) throw new NotFoundException('Randevue not found');

        let start = row.date instanceof Date ? row.date : new Date(row.date as unknown as string);
        let end = row.endTime instanceof Date ? row.endTime : new Date(row.endTime as unknown as string);

        if (dto.startDateTime != null) {
            const s = new Date(dto.startDateTime);
            if (Number.isNaN(s.getTime())) throw new BadRequestException('Invalid start datetime');
            start = s;
        }
        if (dto.endDateTime != null) {
            const e = new Date(dto.endDateTime);
            if (Number.isNaN(e.getTime())) throw new BadRequestException('Invalid end datetime');
            end = e;
        }
        if (end <= start) {
            throw new BadRequestException('End time must be after start time');
        }

        row.date = start;
        row.endTime = end;

        if (dto.patient_id != null && dto.patient_id !== row.patient.id) {
            const patient = await this.repo.assertPatientOwnedByDentist(dentistId, dto.patient_id);
            const appt = row.appointment;
            if (appt && appt.patient && appt.patient.id !== patient.id) {
                row.appointment = null;
                if (row.status === 'booked') row.status = 'scheduled';
            }
            row.patient = patient;
        }

        if (dto.note !== undefined) {
            const trimmed = dto.note.trim();
            row.note = trimmed === '' ? null : trimmed;
        }

        const wantsClear = dto.clear_appointment === true;
        const wantsLink = dto.appointment_id != null;
        const wantsNew = dto.create_new_appointment === true;
        const apptIntentCount = [wantsClear, wantsLink, wantsNew].filter(Boolean).length;
        if (apptIntentCount > 1) {
            throw new BadRequestException('Only one of clear_appointment, appointment_id, or create_new_appointment is allowed');
        }
        if (dto.create_new_appointment === true && dto.appointment_id != null) {
            throw new BadRequestException('Cannot set both create_new_appointment and appointment_id');
        }
        if (wantsClear) {
            row.appointment = null;
            if (row.status === 'booked') row.status = 'scheduled';
        } else if (wantsNew) {
            if (!dto.appointment_start_date) {
                throw new BadRequestException('appointment_start_date is required when creating a new appointment');
            }
            const created = await this.appointmentService.create(dentistId, {
                startDate: dto.appointment_start_date,
                patient_id: row.patient.id,
                chargedFee: 0,
            });
            row.appointment = { id: created.id } as Appointment;
            row.status = 'booked';
        } else if (wantsLink) {
            await this.repo.assertOpenAppointmentForPatient(dentistId, dto.appointment_id!, row.patient.id);
            row.appointment = { id: dto.appointment_id! } as Appointment;
            row.status = 'booked';
        }

        try {
            await this.repo.saveEntity(row);
            const reloaded = await this.repo.findByIdForDentist(dentistId, id);
            if (!reloaded) throw new Error('Failed to reload randevue');
            const msg = `Dentist ${dentistId} updated Randevue ${id}`;
            this.logger.log(msg);
            LogWriter.append('log', RandevueService.name, msg);
            return this.toResponse(reloaded);
        } catch (e: any) {
            if (e?.message?.includes('Forbidden patient')) {
                throw new BadRequestException("You don't have such a patient");
            }
            if (e?.message === 'Patient not found') throw new NotFoundException('Patient not found');
            if (e?.message === 'Appointment not found') throw new NotFoundException('Appointment not found');
            if (e?.message === 'Appointment already closed') {
                throw new BadRequestException('That appointment is already closed (has an end date)');
            }
            this.logger.error(e?.stack || e?.message);
            throw new BadRequestException('Failed to update randevue');
        }
    }
}
