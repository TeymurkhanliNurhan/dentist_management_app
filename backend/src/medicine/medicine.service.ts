import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MedicineRepository } from './medicine.repository';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class MedicineService {
  private readonly logger = new Logger(MedicineService.name);

  constructor(private readonly repo: MedicineRepository) {}

  async create(dentistId: number, dto: CreateMedicineDto) {
    try {
      const created = await this.repo.createMedicine({
        name: dto.name,
        description: dto.description,
        price: dto.price,
      });
      const msg = `Dentist with id ${dentistId} created Medicine with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', MedicineService.name, msg);
      return {
        id: created.id,
        name: created.name,
        description: created.description,
        price: created.price,
      };
    } catch (e: any) {
      throw new BadRequestException('Failed to create medicine');
    }
  }

  async patch(dentistId: number, id: number, dto: UpdateMedicineDto) {
    try {
      const updated = await this.repo.updateMedicine(id, {
        name: dto.name,
        description: dto.description,
        price: dto.price,
      });
      const msg = `Dentist with id ${dentistId} updated Medicine with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', MedicineService.name, msg);
      return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        price: updated.price,
      };
    } catch (e: any) {
      if (e?.message?.includes('Medicine not found')) throw new NotFoundException('Medicine not found');
      throw new BadRequestException('Failed to update medicine');
    }
  }
}

