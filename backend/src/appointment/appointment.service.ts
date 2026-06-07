import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AppointmentRepository } from './appointment.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAppointmentDto } from './dto/get-appointment.dto';
import { LogWriter } from '../log-writer';
import { isDirectorRole } from '../auth/role-guards';
import { PatientAuthContext } from '../auth/patient-access';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(private readonly repo: AppointmentRepository) {}

  /** TypeORM may return PostgreSQL `date` columns as strings; avoid calling Date methods blindly. */
  private toApiDateOnly(value: Date | string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      return value.length >= 10 ? value.slice(0, 10) : null;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    return null;
  }

  async create(dentistId: number, dto: CreateAppointmentDto) {
    try {
      const created = await this.repo.createAppointmentForDentistAndPatient(
        dentistId,
        dto.patient_id,
        {
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          chargedFee: dto.chargedFee ?? null,
        },
      );
      const msg = `Dentist with id ${dentistId} created Appointment with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', AppointmentService.name, msg);
      return {
        id: created.id,
        startDate: this.toApiDateOnly(created.startDate) ?? '',
        endDate: this.toApiDateOnly(created.endDate),
        calculatedFee: created.calculatedFee,
        chargedFee: created.chargedFee,
        discountFee: created.discountFee,
      };
    } catch (e: any) {
      if (e?.message?.includes('Dentist not found'))
        throw new BadRequestException('Dentist not found');
      if (e?.message?.includes('Patient not found'))
        throw new NotFoundException('Patient not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to create Appointment for non-owned Patient with id ${dto.patient_id}`;
        this.logger.warn(warn);
        LogWriter.append('warn', AppointmentService.name, warn);
        throw new BadRequestException("You don't have such a patient");
      }
      throw new BadRequestException('Failed to create appointment');
    }
  }

  async patch(
    dentistId: number,
    id: number,
    dto: UpdateAppointmentDto,
    role?: string,
  ) {
    try {
      if (isDirectorRole(role)) {
        const hasRestrictedFields =
          dto.startDate !== undefined || dto.endDate !== undefined;
        if (hasRestrictedFields) {
          throw new ForbiddenException(
            'Directors can only update charged fee for appointments',
          );
        }
      }

      const updated = await this.repo.updateAppointmentEnsureOwnership(
        dentistId,
        id,
        {
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate:
            dto.endDate !== undefined
              ? dto.endDate
                ? new Date(dto.endDate)
                : null
              : undefined,
          chargedFee:
            dto.chargedFee !== undefined ? (dto.chargedFee ?? null) : undefined,
        },
      );
      const msg = `Dentist with id ${dentistId} updated Appointment with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', AppointmentService.name, msg);
      return {
        id: updated.id,
        startDate: this.toApiDateOnly(updated.startDate) ?? '',
        endDate: this.toApiDateOnly(updated.endDate),
        calculatedFee: updated.calculatedFee,
        chargedFee: updated.chargedFee,
        discountFee: updated.discountFee,
      };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to update Appointment with id ${id} without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', AppointmentService.name, warn);
        throw new BadRequestException("You don't have such an appointment");
      }
      if (e?.message?.includes('Appointment not found'))
        throw new NotFoundException('Appointment not found');
      if (
        typeof e?.message === 'string' &&
        e.message.includes('Dentist not found')
      ) {
        throw new BadRequestException(
          'Could not resolve dentist profile for this session. Sign out and sign in again.',
        );
      }
      if (e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Failed to update appointment');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteAppointmentEnsureOwnership(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted Appointment with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', AppointmentService.name, msg);
      return { message: 'Appointment deleted successfully' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to delete Appointment with id ${id} without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', AppointmentService.name, warn);
        throw new BadRequestException("You don't have such an appointment");
      }
      if (e?.message?.includes('Appointment not found'))
        throw new NotFoundException('Appointment not found');
      throw new BadRequestException('Failed to delete appointment');
    }
  }

  private mapAppointmentsResponse(
    appointments: Awaited<
      ReturnType<AppointmentRepository['findAppointmentsForDentist']>
    >['appointments'],
    total: number,
    appointmentsDentistMap: Awaited<
      ReturnType<AppointmentRepository['findAppointmentsForDentist']>
    >['appointmentsDentistMap'],
    dto: GetAppointmentDto,
    role?: string,
  ) {
    const r = (role ?? '').toLowerCase();
    const dentistScopedView = r === 'dentist' || r === 'singledentist';
    return {
      appointments: appointments.map((appointment) => {
        const startDate =
          appointment.startDate instanceof Date
            ? appointment.startDate
            : new Date(appointment.startDate);
        const endDate = appointment.endDate
          ? appointment.endDate instanceof Date
            ? appointment.endDate
            : new Date(appointment.endDate)
          : null;

        const dentistInfo = appointmentsDentistMap?.get(appointment.id);

        return {
          id: appointment.id,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate ? endDate.toISOString().slice(0, 10) : null,
          calculatedFee: dentistScopedView
            ? (dentistInfo?.dentistCalculatedFee ?? appointment.calculatedFee)
            : appointment.calculatedFee,
          chargedFee: appointment.chargedFee,
          discountFee: appointment.discountFee,
          patient: {
            id:
              typeof appointment.patient === 'object' &&
              appointment.patient?.id
                ? appointment.patient.id
                : appointment.patient,
            name:
              typeof appointment.patient === 'object' &&
              appointment.patient?.name
                ? appointment.patient.name
                : null,
            surname:
              typeof appointment.patient === 'object' &&
              appointment.patient?.surname
                ? appointment.patient.surname
                : null,
          },
          dentist: dentistInfo?.dentist || null,
          treatmentPercentage: dentistInfo?.treatmentPercentage || null,
          treatmentCount: dentistInfo?.treatmentCount ?? 0,
        };
      }),
      total,
      page: dto.page || 1,
      limit: dto.limit || total,
      totalPages: dto.limit ? Math.ceil(total / dto.limit) : 1,
    };
  }

  async findAllForPatient(context: PatientAuthContext, dto: GetAppointmentDto) {
    const { appointments, total, appointmentsDentistMap } =
      await this.repo.findAppointmentsForPatient(
        context.patientId,
        context.clinicId,
        {
          id: dto.id,
          startDate: dto.startDate,
          startDateFrom: dto.startDateFrom,
          startDateTo: dto.startDateTo,
          endDate: dto.endDate,
          patientName: dto.patientName,
          patientSurname: dto.patientSurname,
          page: dto.page,
          limit: dto.limit,
        },
      );
    const msg = `Patient with id ${context.patientId} retrieved ${appointments.length} appointment(s) out of ${total}`;
    this.logger.log(msg);
    LogWriter.append('log', AppointmentService.name, msg);
    return this.mapAppointmentsResponse(
      appointments,
      total,
      appointmentsDentistMap,
      dto,
      context.role,
    );
  }

  async findAll(dentistId: number, dto: GetAppointmentDto, role?: string) {
    try {
      const { appointments, total, appointmentsDentistMap } =
        await this.repo.findAppointmentsForDentist(dentistId, {
          id: dto.id,
          startDate: dto.startDate,
          startDateFrom: dto.startDateFrom,
          startDateTo: dto.startDateTo,
          endDate: dto.endDate,
          patient: dto.patient,
          patientName: dto.patientName,
          patientSurname: dto.patientSurname,
          page: dto.page,
          limit: dto.limit,
        });
      const msg = `Dentist with id ${dentistId} retrieved ${appointments.length} appointment(s) out of ${total}`;
      this.logger.log(msg);
      LogWriter.append('log', AppointmentService.name, msg);
      return this.mapAppointmentsResponse(
        appointments,
        total,
        appointmentsDentistMap,
        dto,
        role,
      );
    } catch (e: any) {
      throw e;
    }
  }
}
