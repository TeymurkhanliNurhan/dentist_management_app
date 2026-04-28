import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WorkingHoursRepository } from './working_hours.repository';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { GetWorkingHoursDto } from './dto/get-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class WorkingHoursService {
  private readonly logger = new Logger(WorkingHoursService.name);

  constructor(private readonly repo: WorkingHoursRepository) {}

  private ensureDirectorRole(role?: string) {
    if ((role ?? '').toLowerCase() !== 'director') {
      throw new ForbiddenException('Only director can access working hours endpoints');
    }
  }

  private parseNumericId(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
  }

  private resolveStaffIdFromUser(user: any): number {
    const staffId = this.parseNumericId(user?.staffId ?? user?.staff_id);
    if (!Number.isFinite(staffId) || staffId <= 0) {
      throw new ForbiddenException('Staff context missing');
    }
    return staffId;
  }

  async create(dentistId: number, role: string | undefined, dto: CreateWorkingHoursDto) {
    this.ensureDirectorRole(role);
    try {
      const created = await this.repo.createForDentist(dentistId, dto);
      const msg = `Dentist with id ${dentistId} created WorkingHours with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', WorkingHoursService.name, msg);
      return created;
    } catch (e: any) {
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to create working hours');
    }
  }

  async findAll(user: any, dto: GetWorkingHoursDto) {
    const role = (user?.role ?? '').toLowerCase();

    if (role === 'director') {
      const dentistId = this.parseNumericId(user?.userId ?? user?.sub ?? user?.dentistId);
      if (!Number.isFinite(dentistId) || dentistId <= 0) {
        throw new ForbiddenException('Director context missing');
      }
      return await this.repo.findForDentist(dentistId, dto);
    }

    const staffId = this.resolveStaffIdFromUser(user);
    return await this.repo.findForStaff(staffId, dto);
  }

  async patch(
    dentistId: number,
    role: string | undefined,
    id: number,
    dto: UpdateWorkingHoursDto,
  ) {
    this.ensureDirectorRole(role);
    try {
      const updated = await this.repo.updateForDentist(dentistId, id, dto);
      const msg = `Dentist with id ${dentistId} updated WorkingHours with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', WorkingHoursService.name, msg);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Working hours not found');
      if (e?.message?.includes('Staff not found'))
        throw new BadRequestException('Staff not found in your clinic');
      throw new BadRequestException('Failed to update working hours');
    }
  }

  async delete(dentistId: number, role: string | undefined, id: number) {
    this.ensureDirectorRole(role);
    try {
      await this.repo.deleteForDentist(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted WorkingHours with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', WorkingHoursService.name, msg);
      return { message: 'Working hours deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Working hours not found');
      throw new BadRequestException('Failed to delete working hours');
    }
  }
}
