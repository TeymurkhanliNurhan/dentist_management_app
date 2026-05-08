import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DentistTreatmentRepository } from './dentist_treatment.repository';
import { CreateDentistTreatmentDto } from './dto/create-dentist_treatment.dto';
import { DeleteDentistTreatmentDto } from './dto/delete-dentist_treatment.dto';
import { GetDentistTreatmentDto } from './dto/get-dentist_treatment.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class DentistTreatmentService {
  private readonly logger = new Logger(DentistTreatmentService.name);

  constructor(private readonly repo: DentistTreatmentRepository) {}

  async create(dto: CreateDentistTreatmentDto) {
    try {
      const created = await this.repo.createLink(dto.treatment, dto.dentist);
      const msg = `Linked treatment ${dto.treatment} to dentist ${dto.dentist}`;
      this.logger.log(msg);
      LogWriter.append('log', DentistTreatmentService.name, msg);
      return {
        treatment: created.treatment,
        dentist: created.dentist,
      };
    } catch (e: any) {
      if (e?.message?.includes('Treatment not found')) {
        throw new NotFoundException('Treatment not found');
      }
      if (e?.message?.includes('Dentist not found')) {
        throw new NotFoundException('Dentist not found');
      }
      if (e?.message?.includes('Already exists')) {
        throw new BadRequestException(
          'This dentist-treatment link already exists',
        );
      }
      throw new BadRequestException('Failed to create dentist-treatment link');
    }
  }

  async remove(dto: DeleteDentistTreatmentDto) {
    try {
      await this.repo.deleteLink(dto.treatment, dto.dentist);
      const msg = `Deleted treatment ${dto.treatment} from dentist ${dto.dentist}`;
      this.logger.log(msg);
      LogWriter.append('log', DentistTreatmentService.name, msg);
      return { message: 'Dentist-treatment link deleted successfully' };
    } catch (e: any) {
      if (e?.message?.includes('Not found')) {
        throw new NotFoundException('Dentist-treatment link not found');
      }
      throw new BadRequestException('Failed to delete dentist-treatment link');
    }
  }

  async findAll(dto: GetDentistTreatmentDto) {
    const records = await this.repo.findAll({
      treatment: dto.treatment,
      dentist: dto.dentist,
    });
    const msg = `Retrieved ${records.length} dentist-treatment link(s)`;
    this.logger.log(msg);
    LogWriter.append('log', DentistTreatmentService.name, msg);

    return records.map((record) => ({
      treatment: record.treatment,
      dentist: record.dentist,
    }));
  }
}
