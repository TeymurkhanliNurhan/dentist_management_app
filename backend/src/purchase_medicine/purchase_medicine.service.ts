import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseMedicineRepository } from './purchase_medicine.repository';
import { CreatePurchaseMedicineDto } from './dto/create-purchase-medicine.dto';
import { GetPurchaseMedicineDto } from './dto/get-purchase-medicine.dto';
import { UpdatePurchaseMedicineDto } from './dto/update-purchase-medicine.dto';
import { CreatePurchaseSessionDto } from './dto/create-purchase-session.dto';

@Injectable()
export class PurchaseMedicineService {
  constructor(private readonly repo: PurchaseMedicineRepository) {}

  private ensureDirectorOrReceptionist(role?: string) {
    const normalized = (role ?? '').toLowerCase();
    const allowed =
      normalized === 'director' ||
      normalized === 'frontdesk' ||
      normalized === 'receptionist' ||
      normalized === 'front_desk_worker';
    if (!allowed) {
      throw new ForbiddenException(
        'Only director and receptionist can access purchase medicine endpoints',
      );
    }
  }

  async create(
    dentistId: number,
    role: string | undefined,
    dto: CreatePurchaseMedicineDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    const totalPrice = dto.totalPrice ?? dto.count * dto.pricePerOne;
    try {
      return await this.repo.createForDentist(dentistId, {
        ...dto,
        totalPrice,
      });
    } catch (e: any) {
      if (e?.message?.includes('Medicine not found')) {
        throw new NotFoundException('Medicine not found in your clinic');
      }
      if (e?.message?.includes('PaymentDetails not found')) {
        throw new NotFoundException('PaymentDetails not found in your clinic');
      }
      throw new BadRequestException('Failed to create purchase medicine');
    }
  }

  async createSession(
    dentistId: number,
    role: string | undefined,
    dto: CreatePurchaseSessionDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    try {
      return await this.repo.createSessionForDentist(dentistId, {
        items: dto.items,
      });
    } catch (e: any) {
      if (e?.message?.includes('Medicine not found')) {
        throw new NotFoundException('Medicine not found in your clinic');
      }
      throw new BadRequestException('Failed to create purchase medicines');
    }
  }

  async findAll(
    dentistId: number,
    role: string | undefined,
    dto: GetPurchaseMedicineDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    return await this.repo.findForDentist(dentistId, dto);
  }

  async patch(
    dentistId: number,
    role: string | undefined,
    id: number,
    dto: UpdatePurchaseMedicineDto,
  ) {
    this.ensureDirectorOrReceptionist(role);
    try {
      const totalPrice =
        dto.totalPrice ??
        (dto.count !== undefined && dto.pricePerOne !== undefined
          ? dto.count * dto.pricePerOne
          : undefined);

      return await this.repo.updateForDentist(dentistId, id, {
        ...dto,
        totalPrice,
      });
    } catch (e: any) {
      if (e?.message?.includes('PurchaseMedicine not found')) {
        throw new NotFoundException('PurchaseMedicine not found');
      }
      if (e?.message?.includes('Medicine not found')) {
        throw new NotFoundException('Medicine not found in your clinic');
      }
      if (e?.message?.includes('PaymentDetails not found')) {
        throw new NotFoundException('PaymentDetails not found in your clinic');
      }
      throw new BadRequestException('Failed to update purchase medicine');
    }
  }

  async delete(dentistId: number, role: string | undefined, id: number) {
    this.ensureDirectorOrReceptionist(role);
    try {
      await this.repo.deleteForDentist(dentistId, id);
      return { message: 'PurchaseMedicine deleted' };
    } catch (e: any) {
      if (e?.message?.includes('PurchaseMedicine not found')) {
        throw new NotFoundException('PurchaseMedicine not found');
      }
      throw new BadRequestException('Failed to delete purchase medicine');
    }
  }
}
