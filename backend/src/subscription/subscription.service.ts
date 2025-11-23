import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Subscription Service
 * 
 * This service handles subscription validation and management:
 * - Validates if dentist's free month has expired
 * - Checks if last payment was more than 30 days ago
 * - Auto-deactivates expired subscriptions via cron job
 * - Provides methods to check subscription status
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Dentist)
    private readonly dentistRepository: Repository<Dentist>,
  ) {}

  /**
   * Check if a dentist's subscription is active
   * 
   * Rules:
   * - First month is free (30 days from created_date)
   * - After first month, must have paid within last 30 days
   * 
   * @param dentistId - The dentist ID to check
   * @returns true if subscription is active, false otherwise
   */
  async isSubscriptionActive(dentistId: number): Promise<boolean> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    return this.checkSubscriptionStatus(dentist);
  }

  /**
   * Check subscription status for a dentist entity
   * This is the core logic for determining if subscription is active
   */
  private checkSubscriptionStatus(dentist: Dentist): boolean {
    const now = new Date();
    const createdDate = new Date(dentist.created_date);
    
    // Calculate 30 days from creation (free month)
    const freeMonthEnd = new Date(createdDate);
    freeMonthEnd.setDate(freeMonthEnd.getDate() + 30);

    // If still within free month, subscription is active
    if (now < freeMonthEnd) {
      return true;
    }

    // After free month, check if there's a recent payment
    if (!dentist.last_payment_date) {
      // No payment ever made after free month
      return false;
    }

    const lastPaymentDate = new Date(dentist.last_payment_date);
    const paymentExpiry = new Date(lastPaymentDate);
    paymentExpiry.setDate(paymentExpiry.getDate() + 30);

    // Subscription is active if payment was made within last 30 days
    return now < paymentExpiry;
  }

  /**
   * Validate and update subscription status for a dentist
   * This should be called before checking subscription to ensure DB is up to date
   */
  async validateAndUpdateSubscription(dentistId: number): Promise<boolean> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    const shouldBeActive = this.checkSubscriptionStatus(dentist);
    
    // Update database if status changed
    if (dentist.active !== shouldBeActive) {
      await this.dentistRepository.update(dentistId, { active: shouldBeActive });
      this.logger.log(
        `Subscription status updated for dentist ${dentistId}: ${dentist.active} -> ${shouldBeActive}`,
      );
    }

    return shouldBeActive;
  }

  /**
   * Activate subscription after successful payment
   * Updates last_payment_date and sets active to true
   */
  async activateSubscription(dentistId: number): Promise<void> {
    const dentist = await this.dentistRepository.findOne({ where: { id: dentistId } });
    
    if (!dentist) {
      throw new NotFoundException('Dentist not found');
    }

    await this.dentistRepository.update(dentistId, {
      active: true,
      last_payment_date: new Date(),
    });

    this.logger.log(`Subscription activated for dentist ${dentistId}`);
  }

  /**
   * Cron job that runs daily at midnight to check and deactivate expired subscriptions
   * 
   * This job:
   * - Finds all dentists
   * - Checks if their subscription should be active
   * - Deactivates those whose free month expired and haven't paid in 30+ days
   */
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

  /**
   * Get subscription details for a dentist
   * Returns information about subscription status, free month expiry, etc.
   */
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

    // Calculate actual subscription status (don't rely on DB field which might be outdated)
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



