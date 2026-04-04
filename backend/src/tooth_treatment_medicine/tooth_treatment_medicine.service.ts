import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ToothTreatmentMedicineRepository } from './tooth_treatment_medicine.repository';
import { CreateToothTreatmentMedicineDto } from './dto/create-tooth_treatment_medicine.dto';
import { GetToothTreatmentMedicineDto } from './dto/get-tooth_treatment_medicine.dto';
import { UpdateToothTreatmentMedicineDto } from './dto/update-tooth_treatment_medicine.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class ToothTreatmentMedicineService {
  private readonly logger = new Logger(ToothTreatmentMedicineService.name);

  constructor(private readonly repo: ToothTreatmentMedicineRepository) {}

  async create(dentistId: number, dto: CreateToothTreatmentMedicineDto) {
    try {
      const quantity = dto.quantity ?? 1;
      const created = await this.repo.createForDentist(dentistId, dto.tooth_treatment_id, dto.medicine_id, quantity);
      const msg = `Dentist with id ${dentistId} added quantity ${quantity} for Medicine ${dto.medicine_id} in ToothTreatment ${dto.tooth_treatment_id}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentMedicineService.name, msg);
      return {
        tooth_treatment: created.toothTreatment,
        medicine: created.medicine,
        quantity: created.quantity,
      };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found')) throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('Medicine not found')) throw new NotFoundException('Medicine not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to create ToothTreatmentMedicine for non-owned resources`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentMedicineService.name, warn);
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      throw new BadRequestException('Failed to create tooth treatment medicine');
    }
  }

  async updateQuantity(dentistId: number, toothTreatmentId: number, medicineId: number, dto: UpdateToothTreatmentMedicineDto) {
    try {
      const updated = await this.repo.updateQuantityEnsureOwnership(dentistId, toothTreatmentId, medicineId, dto.quantity);
      const msg = `Dentist with id ${dentistId} updated Medicine ${medicineId} quantity to ${dto.quantity} for ToothTreatment ${toothTreatmentId}`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentMedicineService.name, msg);
      return {
        tooth_treatment: updated.toothTreatment,
        medicine: updated.medicine,
        quantity: updated.quantity,
      };
    } catch (e: any) {
      if (e?.message?.includes('ToothTreatment not found')) throw new NotFoundException('ToothTreatment not found');
      if (e?.message?.includes('ToothTreatmentMedicine not found')) throw new NotFoundException('ToothTreatmentMedicine not found');
      if (e?.message?.includes('Forbidden')) {
        const warn = `Dentist with id ${dentistId} attempted to update ToothTreatmentMedicine for ToothTreatment ${toothTreatmentId} without ownership`;
        this.logger.warn(warn);
        LogWriter.append('warn', ToothTreatmentMedicineService.name, warn);
        throw new BadRequestException("You don't have such a tooth treatment medicine");
      }
      throw new BadRequestException('Failed to update tooth treatment medicine quantity');
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

  async findAll(dentistId: number, dto: GetToothTreatmentMedicineDto) {
    try {
      const toothTreatmentMedicines = await this.repo.findToothTreatmentMedicinesForDentist(dentistId, {
        medicine: dto.medicine,
        toothTreatment: dto.tooth_treatment,
      });
      const msg = `Dentist with id ${dentistId} retrieved ${toothTreatmentMedicines.length} tooth treatment medicine(s)`;
      this.logger.log(msg);
      LogWriter.append('log', ToothTreatmentMedicineService.name, msg);
      return toothTreatmentMedicines.map(ttm => ({
        medicine: {
          id: ttm.medicineEntity?.id || ttm.medicine,
          name: ttm.medicineEntity?.name || null,
          description: ttm.medicineEntity?.description || null,
          price: ttm.medicineEntity?.price ?? ttm.medicinePriceSnapshot ?? 0,
        },
        tooth_treatment: ttm.toothTreatment,
        quantity: ttm.quantity,
      }));
    } catch (e: any) {
      throw e;
    }
  }
}

