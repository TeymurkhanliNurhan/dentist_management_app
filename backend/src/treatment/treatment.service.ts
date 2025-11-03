import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TreatmentRepository } from './treatment.repository';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class TreatmentService {
  private readonly logger = new Logger(TreatmentService.name);

  constructor(private readonly repo: TreatmentRepository) {}

  async create(dentistId: number, dto: CreateTreatmentDto) {
    try {
      const created = await this.repo.createTreatmentForDentist(dentistId, {
        name: dto.name,
        price: dto.price,
        description: dto.description,
      });
      const msg = `Dentist with id ${dentistId} created Treatment with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', TreatmentService.name, msg);
      return {
        id: created.id,
        name: created.name,
        price: created.price,
        description: created.description,
      };
    } catch (e: any) {
      if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
      throw new BadRequestException('Failed to create treatment');
    }
  }

  async patch(dentistId: number, id: number, dto: UpdateTreatmentDto) {
    try {
      const updated = await this.repo.updateTreatmentEnsureOwnership(dentistId, id, {
        name: dto.name,
        price: dto.price,
        description: dto.description,
      });
      const msg = `Dentist with id ${dentistId} updated Treatment with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', TreatmentService.name, msg);
      return {
        id: updated.id,
        name: updated.name,
        price: updated.price,
        description: updated.description,
      };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden')) throw new BadRequestException("You don't have such a treatment");
      if (e?.message?.includes('Treatment not found')) throw new NotFoundException('Treatment not found');
      throw new BadRequestException('Failed to update treatment');
    }
  }
}
