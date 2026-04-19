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

  private parseNumericId(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = parseInt(value, 10);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  }

  /** JWT may omit `staffId` on older tokens; resolve from dentist row when role is dentist. */
  private async resolveDentistJwtStaffId(user: any, contextDentistId: number): Promise<number> {
    const rawStaff = user?.staffId ?? user?.staff_id;
    const fromJwt = this.parseNumericId(rawStaff);
    if (fromJwt >= 1) return fromJwt;

    const role = (user?.role ?? '').toLowerCase();
    if (role === 'dentist') {
      const fromDb = await this.repo.getStaffIdByDentistId(contextDentistId);
      if (fromDb != null && fromDb >= 1) return fromDb;
    }

    throw new BadRequestException('Staff context missing for dentist');
  }

  async create(dentistId: number, dto: CreateBlockingHoursDto, user?: any) {
    const role = (user?.role ?? '').toLowerCase();

    let staffId = dto.staffId;
    let name =
      dto.name != null && dto.name.trim() !== '' ? dto.name.trim().slice(0, 127) : null;

    if (role === 'dentist') {
      staffId = await this.resolveDentistJwtStaffId(user, dentistId);
      if (!name) {
        const display = await this.repo.getStaffDisplayName(staffId, dentistId);
        name = display.slice(0, 127) || null;
      }
    }

    try {
      const created = await this.repo.createForDentist(dentistId, {
        startTime: dto.startTime,
        endTime: dto.endTime,
        staffId,
        roomId: dto.roomId,
        name,
      });
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

  async patch(dentistId: number, id: number, dto: UpdateBlockingHoursDto, user?: any) {
    const role = (user?.role ?? '').toLowerCase();

    if (role === 'dentist') {
      const jwtStaffId = await this.resolveDentistJwtStaffId(user, dentistId);
      const rows = await this.repo.findForDentist(dentistId, { id });
      const existing = rows[0];
      if (!existing || existing.staffId !== jwtStaffId) {
        throw new NotFoundException('Blocking hours not found');
      }
    }

    try {
      const payload: {
        startTime?: string;
        endTime?: string;
        staffId?: number;
        roomId?: number;
        name?: string | null;
      } = { ...dto };
      if (dto.name !== undefined && dto.name !== null) {
        const trimmed = dto.name.trim();
        payload.name = trimmed === '' ? null : trimmed.slice(0, 127);
      }
      const updated = await this.repo.updateForDentist(dentistId, id, payload);
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

  async delete(dentistId: number, id: number, user?: any) {
    const role = (user?.role ?? '').toLowerCase();

    if (role === 'dentist') {
      const jwtStaffId = await this.resolveDentistJwtStaffId(user, dentistId);
      const rows = await this.repo.findForDentist(dentistId, { id });
      const existing = rows[0];
      if (!existing || existing.staffId !== jwtStaffId) {
        throw new NotFoundException('Blocking hours not found');
      }
    }

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
