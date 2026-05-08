import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseRepository } from './expense.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { GetExpenseDto } from './dto/get-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private readonly repo: ExpenseRepository) {}

  private ensureDirectorOrReceptionist(role?: string) {
    const normalized = (role ?? '').toLowerCase();
    const allowed =
      normalized === 'director' ||
      normalized === 'frontdesk' ||
      normalized === 'receptionist' ||
      normalized === 'front_desk_worker';
    if (!allowed) {
      throw new ForbiddenException(
        'Only director and receptionist can access expense endpoints',
      );
    }
  }

  async create(
    dentistId: number,
    role: string | undefined,
    dto: CreateExpenseDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    try {
      return await this.repo.createForDentist(dentistId, dto);
    } catch {
      throw new BadRequestException('Failed to create expense');
    }
  }

  async findAll(dentistId: number, role: string | undefined, dto: GetExpenseDto) {
    this.ensureDirectorOrReceptionist(role);
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(
    dentistId: number,
    role: string | undefined,
    id: number,
    dto: UpdateExpenseDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    try {
      return await this.repo.updateForDentist(dentistId, id, dto);
    } catch (e: any) {
      if (e?.message?.includes('Expense not found')) {
        throw new NotFoundException('Expense not found');
      }
      throw new BadRequestException('Failed to update expense');
    }
  }

  async delete(dentistId: number, role: string | undefined, id: number) {
    this.ensureDirectorOrReceptionist(role);
    try {
      await this.repo.deleteForDentist(dentistId, id);
      return { message: 'Expense deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Expense not found')) {
        throw new NotFoundException('Expense not found');
      }
      throw new BadRequestException('Failed to delete expense');
    }
  }
}
