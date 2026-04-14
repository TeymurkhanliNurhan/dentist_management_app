import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FrontDeskWorkerRepository } from './front_desk_worker.repository';
import { CreateFrontDeskWorkerDto } from './dto/create-front-desk-worker.dto';
import { UpdateFrontDeskWorkerDto } from './dto/update-front-desk-worker.dto';
import { GetFrontDeskWorkerDto } from './dto/get-front-desk-worker.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class FrontDeskWorkerService {
  private readonly logger = new Logger(FrontDeskWorkerService.name);

  constructor(private readonly repo: FrontDeskWorkerRepository) {}

  async create(dentistId: number, dto: CreateFrontDeskWorkerDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, dto);
      const msg = `Dentist with id ${dentistId} created FrontDeskWorker with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', FrontDeskWorkerService.name, msg);
      return created;
    } catch (e: any) {
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to create front desk worker');
    }
  }

  async findAll(dentistId: number, dto: GetFrontDeskWorkerDto) {
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(dentistId: number, id: number, dto: UpdateFrontDeskWorkerDto) {
    try {
      const updated = await this.repo.updateForDentist(dentistId, id, dto);
      const msg = `Dentist with id ${dentistId} updated FrontDeskWorker with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', FrontDeskWorkerService.name, msg);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Front desk worker not found');
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to update front desk worker');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteForDentist(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted FrontDeskWorker with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', FrontDeskWorkerService.name, msg);
      return { message: 'Front desk worker deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Front desk worker not found');
      throw new BadRequestException('Failed to delete front desk worker');
    }
  }
}
