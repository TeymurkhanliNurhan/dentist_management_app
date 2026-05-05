import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MedicineRepository } from './medicine.repository';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { GetMedicineDto } from './dto/get-medicine.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class MedicineService {
  private readonly logger = new Logger(MedicineService.name);

  constructor(private readonly repo: MedicineRepository) {}

  async create(dentistId: number, dto: CreateMedicineDto) {
    try {
      const created = await this.repo.createMedicineForDentist(dentistId, {
        name: dto.name,
        description: (dto.description ?? '').trim(),
        price: dto.price,
        stock: dto.stock,
        stockLimit: dto.stockLimit,
        purchasePrice: dto.purchasePrice,
      });
      const msg = `Dentist with id ${dentistId} created Medicine with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', MedicineService.name, msg);
      return {
        id: created.id,
        name: created.name,
        description: created.description,
        price: created.price,
        stock: created.stock,
        stockLimit: created.stockLimit,
        purchasePrice: created.purchasePrice,
      };
    } catch (e: any) {
      throw new BadRequestException('Failed to create medicine');
    }
  }

  async patch(dentistId: number, id: number, dto: UpdateMedicineDto) {
    try {
      const updated = await this.repo.updateMedicineEnsureOwnership(
        dentistId,
        id,
        {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          stock: dto.stock,
          stockLimit: dto.stockLimit,
          purchasePrice: dto.purchasePrice,
        },
      );
      const msg = `Dentist with id ${dentistId} updated Medicine with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', MedicineService.name, msg);
      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        price: updated.price,
        stock: updated.stock,
        stockLimit: updated.stockLimit,
        purchasePrice: updated.purchasePrice,
      };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new BadRequestException("You don't have such a medicine");
      if (e?.message?.includes('Medicine not found'))
        throw new NotFoundException('Medicine not found');
      throw new BadRequestException('Failed to update medicine');
    }
  }

  async findAll(dentistId: number, dto: GetMedicineDto) {
    try {
      const medicines = await this.repo.findMedicinesForDentist(dentistId, {
        id: dto.id,
        name: dto.name,
      });
      const msg = `Dentist with id ${dentistId} retrieved ${medicines.length} medicine(s)`;
      this.logger.log(msg);
      LogWriter.append('log', MedicineService.name, msg);
      return medicines.map((medicine) => ({
        id: medicine.id,
        name: medicine.name,
        description: medicine.description,
        price: medicine.price,
        stock: medicine.stock,
        stockLimit: medicine.stockLimit,
        purchasePrice: medicine.purchasePrice,
      }));
    } catch (e: any) {
      throw e;
    }
  }

  async remove(dentistId: number, id: number) {
    try {
      const { deletedId } = await this.repo.deleteMedicineEnsureOwnership(
        dentistId,
        id,
      );
      const msg = `Dentist with id ${dentistId} deleted Medicine with id ${deletedId}`;
      this.logger.log(msg);
      LogWriter.append('log', MedicineService.name, msg);
      return { message: 'Medicine deleted successfully' };
    } catch (e: any) {
      if (e?.message === 'Referenced') {
        throw new ConflictException(
          'This medicine cannot be deleted because it is linked to treatments or purchase records.',
        );
      }
      if (e?.message?.includes('Forbidden'))
        throw new BadRequestException("You don't have such a medicine");
      throw new BadRequestException('Failed to delete medicine');
    }
  }
}
