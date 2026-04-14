import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NurseRepository } from './nurse.repository';
import { CreateNurseDto } from './dto/create-nurse.dto';
import { UpdateNurseDto } from './dto/update-nurse.dto';
import { GetNurseDto } from './dto/get-nurse.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class NurseService {
  private readonly logger = new Logger(NurseService.name);

  constructor(private readonly repo: NurseRepository) {}

  async create(dentistId: number, dto: CreateNurseDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, dto);
      const msg = `Dentist with id ${dentistId} created Nurse with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', NurseService.name, msg);
      return created;
    } catch (e: any) {
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to create nurse');
    }
  }

  async findAll(dentistId: number, dto: GetNurseDto) {
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(dentistId: number, id: number, dto: UpdateNurseDto) {
    try {
      const updated = await this.repo.updateForDentist(dentistId, id, dto);
      const msg = `Dentist with id ${dentistId} updated Nurse with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', NurseService.name, msg);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Nurse not found');
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to update nurse');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteForDentist(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted Nurse with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', NurseService.name, msg);
      return { message: 'Nurse deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Nurse not found');
      throw new BadRequestException('Failed to delete nurse');
    }
  }
}
