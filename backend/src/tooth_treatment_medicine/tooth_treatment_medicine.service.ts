import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ToothTreatmentMedicineRepository } from './tooth_treatment_medicine.repository';
import { CreateToothTreatmentMedicineDto } from './dto/create-tooth_treatment_medicine.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class ToothTreatmentMedicineService {
  private readonly logger = new Logger(ToothTreatmentMedicineService.name);

  constructor(private readonly repo: ToothTreatmentMedicineRepository) {}

  async create(dentistId: number, dto: CreateToothTreatmentMedicineDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, dto.tooth_treatment_id, dto.medicine_id);
      const msg = `Dentist with id ${dentistId} created ToothTreatmentMedicine for ToothTreatment ${dto.tooth_treatment_id} with Medicine ${dto.medicine_id}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentMedicineService.name, msg);
      return {
        tooth_treatment: created.toothTreatment,
        medicine: created.medicine,
      };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found')) throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('Medicine not found')) throw new NotFoundException('Medicine not found');
      if (e?.message?.includes('Already exists')) throw new BadRequestException('This medicine is already assigned to this tooth treatment');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to create ToothTreatmentMedicine for non-owned resources`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentMedicineService.name, warn);
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      throw new BadRequestException('Failed to create tooth treatment medicine');
    }
  }

  async delete(dentistId: number, toothTreatmentId: number, medicineId: number) {
    try {
      await this.repo.deleteEnsureOwnership(dentistId, toothTreatmentId, medicineId);
      const msg = `Dentist with id ${dentistId} deleted ToothTreatmentMedicine for ToothTreatment ${toothTreatmentId} with Medicine ${medicineId}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentMedicineService.name, msg);
      return { message: 'Tooth treatment medicine deleted successfully' };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found')) throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('ToothTreatmentMedicine not found')) throw new NotFoundException('ToothTreatmentMedicine not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to delete ToothTreatmentMedicine for ToothTreatment ${toothTreatmentId} without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentMedicineService.name, warn);
        throw new BadRequestException("You don't have such a tooth treatment medicine");
      }
      throw new BadRequestException('Failed to delete tooth treatment medicine');
    }
  }
}

