import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ToothTreatmentRepository } from './tooth_treatment.repository';
import { CreateToothTreatmentDto } from './dto/create-tooth_treatment.dto';
import { UpdateToothTreatmentDto } from './dto/update-tooth_treatment.dto';
import { GetToothTreatmentDto } from './dto/get-tooth_treatment.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class ToothTreatmentService {
  private readonly logger = new Logger(ToothTreatmentService.name);

  constructor(private readonly repo: ToothTreatmentRepository) {}

  async create(dentistId: number, dto: CreateToothTreatmentDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, {
        appointmentId: dto.appointment_id,
        treatmentId: dto.treatment_id,
        patientId: dto.patient_id,
        toothIds: dto.tooth_ids,
        description: dto.description ?? null,
      });
      const msg = `Dentist with id ${dentistId} created ToothTreatment with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentService.name, msg);
      return {
        id: created.id,
        patient: created.patient,
        appointment: created.appointment.id,
        treatment: created.treatment.id,
        description: created.description,
      };
    } catch (e: any) {
      if (e?.message?.includes('Appointment not found'))
        throw new NotFoundException('Appointment not found');
      if (e?.message?.includes('Treatment not found'))
        throw new NotFoundException('Treatment not found');
      if (e?.message?.includes('PatientTooth not found'))
        throw new NotFoundException(e.message);
      if (e?.message?.includes('InvalidPatientForAppointment'))
        throw new BadRequestException('Patient mismatch for appointment');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to create ToothTreatment for non-owned resources`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentService.name, warn);
        throw new BadRequestException("You don't have such a patient");
      }
      throw new BadRequestException('Failed to create tooth treatment');
    }
  }

  async patch(dentistId: number, id: number, dto: UpdateToothTreatmentDto) {
    try {
      const updated = await this.repo.updateEnsureOwnership(dentistId, id, {
        treatmentId: dto.treatment_id,
        toothIds: dto.tooth_ids,
        description: dto.description ?? null,
      });
      const msg = `Dentist with id ${dentistId} updated ToothTreatment with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentService.name, msg);
      return {
        id: updated.id,
        patient: updated.patient,
        appointment: updated.appointment.id,
        treatment: updated.treatment.id,
        description: updated.description,
      };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found'))
        throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('Treatment not found'))
        throw new NotFoundException('Treatment not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to update ToothTreatment with id ${id} without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentService.name, warn);
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      throw new BadRequestException('Failed to update tooth treatment');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteEnsureOwnership(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted ToothTreatment with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentService.name, msg);
      return { message: 'Tooth treatment deleted successfully' };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found'))
        throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to delete ToothTreatment with id ${id} without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentService.name, warn);
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      throw new BadRequestException('Failed to delete tooth treatment');
    }
  }

  async findAll(dentistId: number, dto: GetToothTreatmentDto) {
    try {
      this.logger.log(
        `ToothTreatmentService.findAll called with dentistId=${dentistId}, filters=${JSON.stringify(dto)}`,
      );
      const toothTreatments = await this.repo.findToothTreatmentsForDentist(
        dentistId,
        {
          id: dto.id,
          appointment: dto.appointment,
          tooth: dto.tooth,
          patient: dto.patient,
          treatment: dto.treatment,
          dentist: dto.dentist,
        },
      );
      const msg = `Dentist with id ${dentistId} retrieved ${toothTreatments.length} tooth treatment(s)`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentService.name, msg);
      return toothTreatments.map((tt) => {
        const formatDate = (
          date: Date | string | null | undefined,
        ): string | null => {
          if (!date) return null;
          if (typeof date === 'string') return date;
          return date.toISOString().slice(0, 10);
        };

        const latestRandevueDate =
          tt.toothTreatmentTeeth
            ?.flatMap((ttt) =>
              (ttt.treatmentRandevues ?? [])
                .map((tr) => tr.randevue?.date)
                .filter((d): d is Date => d instanceof Date),
            )
            .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

        return {
          id: tt.id,
          patient: tt.patient,
          feeSnapshot: tt.feeSnapshot,
          dentist: tt.dentist
            ? {
                id: tt.dentist.id,
                staff: {
                  name: tt.dentist.staff?.name ?? '',
                  surname: tt.dentist.staff?.surname ?? '',
                },
              }
            : null,
          appointment: {
            id: tt.appointment?.id,
            startDate: formatDate(tt.appointment?.startDate),
            endDate: formatDate(tt.appointment?.endDate),
          },
          treatment: {
            id: tt.treatment?.id,
            name: tt.treatment?.name,
            description: tt.treatment?.description,
            price: tt.treatment?.price,
            pricePer: tt.treatment?.pricePer ?? null,
          },
          lastRandevueDate: formatDate(latestRandevueDate),
          description: tt.description,
          toothTreatmentTeeth:
            tt.toothTreatmentTeeth?.map((ttt) => ({
              id: ttt.id,
              toothId: ttt.patientTooth?.tooth,
              patientId: ttt.patientTooth?.patient,
            })) || [],
        };
      });
    } catch (e: any) {
      throw e;
    }
  }
}
