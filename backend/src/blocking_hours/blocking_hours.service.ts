import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BlockingHoursRepository } from './blocking_hours.repository';
import { CreateBlockingHoursDto } from './dto/create-blocking-hours.dto';
import { GetBlockingHoursDto } from './dto/get-blocking-hours.dto';
import { UpdateBlockingHoursDto } from './dto/update-blocking-hours.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class BlockingHoursService {
  private readonly logger = new Logger(BlockingHoursService.name);

  constructor(private readonly repo: BlockingHoursRepository) {}

  async create(dentistId: number, dto: CreateBlockingHoursDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, dto);
      const msg = `Dentist with id ${dentistId} created BlockingHours with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', BlockingHoursService.name, msg);
      return created;
    } catch (e: any) {
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      if (e?.message?.includes('Room not found'))
        throw new BadRequestException('Room not found in your clinic');
      throw new BadRequestException('Failed to create blocking hours');
    }
  }

  async findAll(dentistId: number, dto: GetBlockingHoursDto) {
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(dentistId: number, id: number, dto: UpdateBlockingHoursDto) {
    try {
      const updated = await this.repo.updateForDentist(dentistId, id, dto);
      const msg = `Dentist with id ${dentistId} updated BlockingHours with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', BlockingHoursService.name, msg);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Blocking hours not found');
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      if (e?.message?.includes('Room not found'))
        throw new BadRequestException('Room not found in your clinic');
      throw new BadRequestException('Failed to update blocking hours');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteForDentist(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted BlockingHours with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', BlockingHoursService.name, msg);
      return { message: 'Blocking hours deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Blocking hours not found');
      throw new BadRequestException('Failed to delete blocking hours');
    }
  }
}
