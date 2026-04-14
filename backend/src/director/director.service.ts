import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DirectorRepository } from './director.repository';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { GetDirectorDto } from './dto/get-director.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class DirectorService {
  private readonly logger = new Logger(DirectorService.name);

  constructor(private readonly repo: DirectorRepository) {}

  async create(dentistId: number, dto: CreateDirectorDto) {
    try {
      const created = await this.repo.createForDentist(dentistId, dto);
      const msg = `Dentist with id ${dentistId} created Director with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', DirectorService.name, msg);
      return created;
    } catch (e: any) {
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to create director');
    }
  }

  async findAll(dentistId: number, dto: GetDirectorDto) {
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(dentistId: number, id: number, dto: UpdateDirectorDto) {
    try {
      const updated = await this.repo.updateForDentist(dentistId, id, dto);
      const msg = `Dentist with id ${dentistId} updated Director with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', DirectorService.name, msg);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Director not found');
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to update director');
    }
  }

  async delete(dentistId: number, id: number) {
    try {
      await this.repo.deleteForDentist(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted Director with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', DirectorService.name, msg);
      return { message: 'Director deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Director not found');
      throw new BadRequestException('Failed to delete director');
    }
  }
}
