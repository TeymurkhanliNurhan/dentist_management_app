import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ToothTreatmentTeethRepository } from './tooth_treatment_teeth.repository';
import { CreateToothTreatmentTeethDto } from './dto/create-tooth_treatment_teeth.dto';
import { GetToothTreatmentTeethDto } from './dto/get-tooth_treatment_teeth.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class ToothTreatmentTeethService {
  private readonly logger = new Logger(ToothTreatmentTeethService.name);

  constructor(private readonly repo: ToothTreatmentTeethRepository) {}

  async addTeeth(dentistId: number, dto: CreateToothTreatmentTeethDto) {
    try {
      const created = await this.repo.addTeethToTreatment(dentistId, {
        toothTreatmentId: dto.tooth_treatment_id,
        patientId: dto.patient_id,
        toothIds: dto.tooth_ids,
      });
      const msg = `Dentist with id ${dentistId} added ${created.length} teeth to ToothTreatment with id ${dto.tooth_treatment_id}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentTeethService.name, msg);
      return created.map((record) => ({
        id: record.id,
        tooth_treatment_id: record.toothTreatment?.id,
        tooth_id: record.patientTooth?.tooth,
        patient_id: record.patientTooth?.patient,
      }));
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found'))
        throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('PatientTooth not found'))
        throw new NotFoundException(e.message);
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to add teeth without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentTeethService.name, warn);
        throw new BadRequestException(
          "You don't have access to this tooth treatment",
        );
      }
      throw new BadRequestException('Failed to add teeth to treatment');
    }
  }

  async removeTeeth(
    dentistId: number,
    toothTreatmentId: number,
    toothIds: number[],
  ) {
    try {
      await this.repo.removeTeethFromTreatment(dentistId, {
        toothTreatmentId,
        toothIds,
      });
      const msg = `Dentist with id ${dentistId} removed ${toothIds.length} teeth from ToothTreatment with id ${toothTreatmentId}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentTeethService.name, msg);
      return { message: 'Teeth removed successfully' };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found'))
        throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to remove teeth without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentTeethService.name, warn);
        throw new BadRequestException(
          "You don't have access to this tooth treatment",
        );
      }
      throw new BadRequestException('Failed to remove teeth from treatment');
    }
  }

  async getTeethForTreatment(dentistId: number, toothTreatmentId: number) {
    try {
      const records = await this.repo.getTeethForTreatment(
        dentistId,
        toothTreatmentId,
      );
      const msg = `Dentist with id ${dentistId} retrieved teeth for ToothTreatment with id ${toothTreatmentId}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentTeethService.name, msg);
      return records.map((record) => ({
        id: record.id,
        tooth_treatment_id: record.toothTreatment?.id,
        tooth_id: record.patientTooth?.tooth,
        patient_id: record.patientTooth?.patient,
      }));
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found'))
        throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to view teeth without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentTeethService.name, warn);
        throw new BadRequestException(
          "You don't have access to this tooth treatment",
        );
      }
      throw new BadRequestException('Failed to retrieve teeth for treatment');
    }
  }

  async findAll(dentistId: number, dto: GetToothTreatmentTeethDto) {
    try {
      const records = await this.repo.findAll(dentistId, {
        id: dto.id,
        toothTreatmentId: dto.tooth_treatment_id,
        toothId: dto.tooth_id,
        patientId: dto.patient_id,
      });
      const msg = `Dentist with id ${dentistId} retrieved ${records.length} tooth treatment teeth record(s)`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentTeethService.name, msg);
      return records.map((record) => ({
        id: record.id,
        tooth_treatment_id: record.toothTreatment?.id,
        tooth_id: record.patientTooth?.tooth,
        patient_id: record.patientTooth?.patient,
      }));
    } catch (e: any) {
      throw e;
    }
  }
}
