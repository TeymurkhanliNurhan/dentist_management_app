import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SalaryRepository } from './salary.repository';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { GetSalaryDto } from './dto/get-salary.dto';

@Injectable()
export class SalaryService {
  constructor(private readonly repo: SalaryRepository) {}

  private ensureDirectorRole(role?: string) {
    if ((role ?? '').toLowerCase() !== 'director') {
      throw new ForbiddenException('Only director can access salary endpoints');
    }
  }

  async create(dentistId: number, role: string | undefined, dto: CreateSalaryDto) {
    this.ensureDirectorRole(role);
    try {
      return await this.repo.createForDentist(dentistId, dto);
    } catch (e: any) {
      if (e?.message?.includes('Staff not found')) {
        throw new NotFoundException('Staff not found in your clinic');
      }
      if (e?.message?.includes('Salary already exists')) {
        throw new BadRequestException('Salary already exists for this staff');
      }
      throw new BadRequestException('Failed to create salary');
    }
  }

  async findAll(dentistId: number, role: string | undefined, dto: GetSalaryDto) {
    this.ensureDirectorRole(role);
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(
    dentistId: number,
    role: string | undefined,
    staffId: number,
    dto: UpdateSalaryDto,
  ) {
    this.ensureDirectorRole(role);
    try {
      return await this.repo.updateForDentist(dentistId, staffId, dto);
    } catch (e: any) {
      if (e?.message?.includes('Salary not found')) {
        throw new NotFoundException('Salary not found');
      }
      throw new BadRequestException('Failed to update salary');
    }
  }

  async delete(dentistId: number, role: string | undefined, staffId: number) {
    this.ensureDirectorRole(role);
    try {
      await this.repo.deleteForDentist(dentistId, staffId);
      return { message: 'Salary deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Salary not found')) {
        throw new NotFoundException('Salary not found');
      }
      throw new BadRequestException('Failed to delete salary');
    }
  }
}
