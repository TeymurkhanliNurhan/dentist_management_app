import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentDetailsRepository } from './payment_details.repository';
import { CreatePaymentDetailsDto } from './dto/create-payment-details.dto';
import { GetPaymentDetailsDto } from './dto/get-payment-details.dto';
import { UpdatePaymentDetailsDto } from './dto/update-payment-details.dto';
import { GetFinanceOverviewDto } from './dto/get-finance-overview.dto';

@Injectable()
export class PaymentDetailsService {
  constructor(private readonly repo: PaymentDetailsRepository) {}

  private ensureDirectorOrReceptionist(role?: string) {
    const normalized = (role ?? '').toLowerCase();
    const allowed =
      normalized === 'director' ||
      normalized === 'frontdesk' ||
      normalized === 'receptionist' ||
      normalized === 'front_desk_worker';
    if (!allowed) {
      throw new ForbiddenException(
        'Only director and receptionist can access payment details endpoints',
      );
    }
  }

  async create(
    dentistId: number,
    role: string | undefined,
    dto: CreatePaymentDetailsDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    try {
      return await this.repo.createForDentist(dentistId, dto);
    } catch (e: any) {
      if (e?.message?.includes('Expense not found')) {
        throw new NotFoundException('Expense not found in your clinic');
      }
      if (e?.message?.includes('Salary not found')) {
        throw new NotFoundException('Salary not found in your clinic');
      }
      throw new BadRequestException('Failed to create payment details');
    }
  }

  async findAll(
    dentistId: number,
    role: string | undefined,
    dto: GetPaymentDetailsDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(
    dentistId: number,
    role: string | undefined,
    id: number,
    dto: UpdatePaymentDetailsDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    try {
      return await this.repo.updateForDentist(dentistId, id, dto);
    } catch (e: any) {
      if (e?.message?.includes('PaymentDetails not found')) {
        throw new NotFoundException('PaymentDetails not found');
      }
      if (e?.message?.includes('Expense not found')) {
        throw new NotFoundException('Expense not found in your clinic');
      }
      if (e?.message?.includes('Salary not found')) {
        throw new NotFoundException('Salary not found in your clinic');
      }
      throw new BadRequestException('Failed to update payment details');
    }
  }

  async delete(dentistId: number, role: string | undefined, id: number) {
    this.ensureDirectorOrReceptionist(role);
    try {
      await this.repo.deleteForDentist(dentistId, id);
      return { message: 'PaymentDetails deleted' };
    } catch (e: any) {
      if (e?.message?.includes('PaymentDetails not found')) {
        throw new NotFoundException('PaymentDetails not found');
      }
      throw new BadRequestException('Failed to delete payment details');
    }
  }

  async getFinanceOverview(
    dentistId: number,
    role: string | undefined,
    dto: GetFinanceOverviewDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    return await this.repo.getFinanceOverviewForDentist(dentistId, dto);
  }
}
