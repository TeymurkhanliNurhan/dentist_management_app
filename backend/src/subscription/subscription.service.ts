import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Dentist)
    private readonly dentistRepository: Repository<Dentist>,
  ) {}

  async isSubscriptionActive(dentistId: number): Promise<boolean> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    return this.checkSubscriptionStatus(dentist);
  }

  private checkSubscriptionStatus(dentist: Dentist): boolean {
    const now = new Date();
    const createdDate = new Date(dentist.created_date);
    
    const freeMonthEnd = new Date(createdDate);
    freeMonthEnd.setDate(freeMonthEnd.getDate() + 30);

    if (now < freeMonthEnd) {
      return true;
    }

    if (!dentist.last_payment_date) {
      return false;
    }

    const lastPaymentDate = new Date(dentist.last_payment_date);
    const paymentExpiry = new Date(lastPaymentDate);
    paymentExpiry.setDate(paymentExpiry.getDate() + 30);

    return now < paymentExpiry;
  }

  async validateAndUpdateSubscription(dentistId: number): Promise<boolean> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    const shouldBeActive = this.checkSubscriptionStatus(dentist);
    
    if (dentist.active !== shouldBeActive) {
      await this.dentistRepository.update(dentistId, { active: shouldBeActive });
      this.logger.log(
        `Subscription status updated for dentist ${dentistId}: ${dentist.active} -> ${shouldBeActive}`,
      );
    }

    return shouldBeActive;
  }

  async activateSubscription(dentistId: number): Promise<void> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    const now = new Date();
    const createdDate = new Date(dentist.created_date);
    const freeMonthEnd = new Date(createdDate);
    freeMonthEnd.setDate(freeMonthEnd.getDate() + 30);

    let newPaymentDate: Date;

    const isCurrentlyActive = this.checkSubscriptionStatus(dentist);

    if (isCurrentlyActive) {
      if (now < freeMonthEnd) {
        newPaymentDate = freeMonthEnd;
      } else if (dentist.last_payment_date) {
        const currentExpiry = new Date(dentist.last_payment_date);
        currentExpiry.setDate(currentExpiry.getDate() + 30);
        newPaymentDate = currentExpiry;
      } else {
        newPaymentDate = now;
      }
    } else {
      newPaymentDate = now;
    }

    await this.dentistRepository.update(dentistId, {
      active: true,
      last_payment_date: newPaymentDate,
    });

    this.logger.log(
      `Subscription ${isCurrentlyActive ? 'extended' : 'activated'} for dentist ${dentistId}. New expiry: ${new Date(newPaymentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()}`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkAndDeactivateExpiredSubscriptions(): Promise<void> {
    this.logger.log('Running scheduled subscription check...');

    try {
      const dentists = await this.dentistRepository.find();
      let deactivatedCount = 0;

      for (const dentist of dentists) {
        const shouldBeActive = this.checkSubscriptionStatus(dentist);
        
        if (!shouldBeActive && dentist.active) {
          await this.dentistRepository.update(dentist.id, { active: false });
          deactivatedCount++;
          this.logger.log(
            `Deactivated subscription for dentist ${dentist.id} (email: ${dentist.gmail})`,
          );
        }
      }

      this.logger.log(
        `Subscription check completed. Deactivated ${deactivatedCount} expired subscription(s).`,
      );
    } catch (error) {
      this.logger.error(`Error in subscription check cron job: ${error.message}`);
    }
  }

  async getSubscriptionDetails(dentistId: number): Promise<{
    active: boolean;
    createdDate: Date;
    lastPaymentDate: Date | null;
    freeMonthEnd: Date;
    isInFreeMonth: boolean;
    daysUntilExpiry: number | null;
  }> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    const now = new Date();
    const createdDate = new Date(dentist.created_date);
    const freeMonthEnd = new Date(createdDate);
    freeMonthEnd.setDate(freeMonthEnd.getDate() + 30);
    const isInFreeMonth = now < freeMonthEnd;

    let daysUntilExpiry: number | null = null;
    
    if (isInFreeMonth) {
      daysUntilExpiry = Math.ceil((freeMonthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (dentist.last_payment_date) {
      const lastPaymentDate = new Date(dentist.last_payment_date);
      const paymentExpiry = new Date(lastPaymentDate);
      paymentExpiry.setDate(paymentExpiry.getDate() + 30);
      daysUntilExpiry = Math.ceil((paymentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const actualActive = this.checkSubscriptionStatus(dentist);

    return {
      active: actualActive,
      createdDate: dentist.created_date,
      lastPaymentDate: dentist.last_payment_date,
      freeMonthEnd,
      isInFreeMonth,
      daysUntilExpiry,
    };
  }
}
