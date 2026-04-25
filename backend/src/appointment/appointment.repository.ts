import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Salary } from '../salary/entities/salary.entity';
import {
  calculateAppointmentCalculatedFee,
  calculateAppointmentDiscountFee,
} from './appointment-fee.util';

@Injectable()
export class AppointmentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Appointment> {
    return this.dataSource.getRepository(Appointment);
  }

  private applyFeeRules(appointment: Appointment): Appointment {
    appointment.calculatedFee = calculateAppointmentCalculatedFee(appointment);
    appointment.discountFee = calculateAppointmentDiscountFee(
      appointment.calculatedFee,
      appointment.chargedFee,
    );
    return appointment;
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentistRepo = this.dataSource.getRepository(Dentist);
    const dentist = await dentistRepo.findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  async createAppointmentForDentistAndPatient(
    dentistId: number,
    patientId: number,
    input: { startDate: Date; endDate: Date | null; chargedFee: number | null },
  ): Promise<Appointment> {
    const patientRepo = this.dataSource.getRepository(Patient);
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const patient = await patientRepo.findOne({
      where: { id: patientId },
      relations: ['clinic'],
    });
    if (!patient?.clinic) throw new Error('Patient not found');
    if (patient.clinic.id !== clinicId)
      throw new Error('Forbidden');
    const appointment = this.repo.create({
      ...input,
      calculatedFee: 0,
      discountFee: calculateAppointmentDiscountFee(0, input.chargedFee),
      clinicId,
      patient,
    });
    return await this.repo.save(appointment);
  }

  async updateAppointmentEnsureOwnership(
    dentistId: number,
    id: number,
    updates: Partial<{
      startDate: Date;
      endDate: Date | null;
      chargedFee: number | null;
    }>,
  ): Promise<Appointment> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const appointment = await this.repo.findOne({
      where: { id, clinicId },
    });
    if (!appointment) throw new Error('Forbidden');
    if (updates.startDate !== undefined)
      appointment.startDate = updates.startDate;
    if (updates.endDate !== undefined) appointment.endDate = updates.endDate;
    if (updates.chargedFee !== undefined) {
      appointment.chargedFee = updates.chargedFee;
      appointment.discountFee = calculateAppointmentDiscountFee(
        appointment.calculatedFee,
        appointment.chargedFee,
      );
    }
    return await this.repo.save(appointment);
  }

  async recalculateAppointmentFees(
    appointmentId: number,
  ): Promise<Appointment> {
    const appointment = await this.repo.findOne({
      where: { id: appointmentId },
      relations: [
        'toothTreatments',
        'toothTreatments.treatment',
        'toothTreatments.toothTreatmentMedicines',
        'toothTreatments.toothTreatmentMedicines.medicineEntity',
      ],
    });
    if (!appointment) throw new Error('Appointment not found');
    this.applyFeeRules(appointment);
    return await this.repo.save(appointment);
  }

  async deleteAppointmentEnsureOwnership(
    dentistId: number,
    id: number,
  ): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const appointment = await this.repo.findOne({
      where: { id, clinicId },
    });
    if (!appointment) throw new Error('Forbidden');
    await this.repo.remove(appointment);
  }

  async findAppointmentsForDentist(
    dentistId: number,
    filters: {
      id?: number;
      startDate?: string;
      startDateFrom?: string;
      startDateTo?: string;
      endDate?: string;
      patient?: number;
      patientName?: string;
      patientSurname?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ appointments: Appointment[]; total: number; appointmentsDentistMap: Map<number, { dentist: { id: number; name: string; surname: string } | null; treatmentPercentage: number | null; dentistCalculatedFee: number }> }> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const queryBuilder = this.repo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoin('appointment.toothTreatments', 'toothTreatment')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere(
        '(toothTreatment.id IS NULL OR toothTreatment.dentist = :dentistId)',
        { dentistId },
      )
      .distinct(true);

    if (filters.id !== undefined) {
      queryBuilder.andWhere('appointment.id = :id', { id: filters.id });
    }
    if (filters.startDate !== undefined) {
      queryBuilder.andWhere('appointment.startDate = :startDate', {
        startDate: filters.startDate,
      });
    } else {
      if (filters.startDateFrom !== undefined) {
        queryBuilder.andWhere('appointment.startDate >= :startDateFrom', {
          startDateFrom: filters.startDateFrom,
        });
      }
      if (filters.startDateTo !== undefined) {
        queryBuilder.andWhere('appointment.startDate <= :startDateTo', {
          startDateTo: filters.startDateTo,
        });
      }
    }
    if (filters.endDate !== undefined) {
      queryBuilder.andWhere('appointment.endDate = :endDate', {
        endDate: filters.endDate,
      });
    }
    if (filters.patient !== undefined) {
      queryBuilder.andWhere('appointment.patient = :patient', {
        patient: filters.patient,
      });
    }
    if (filters.patientName !== undefined) {
      queryBuilder.andWhere('LOWER(patient.name) LIKE LOWER(:patientName)', {
        patientName: `${filters.patientName}%`,
      });
    }
    if (filters.patientSurname !== undefined) {
      queryBuilder.andWhere(
        'LOWER(patient.surname) LIKE LOWER(:patientSurname)',
        { patientSurname: `${filters.patientSurname}%` },
      );
    }

    // Add ordering by startDate descending
    queryBuilder.orderBy('appointment.startDate', 'DESC');

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    if (filters.page !== undefined && filters.limit !== undefined) {
      const offset = (filters.page - 1) * filters.limit;
      queryBuilder.skip(offset).take(filters.limit);
    }

    const appointments = await queryBuilder.getMany();

    // Fetch dentist and salary information for each appointment
    const appointmentsDentistMap = await this.fetchAppointmentsDentistAndSalary(appointments, dentistId);

    return { appointments, total, appointmentsDentistMap };
  }

  private async fetchAppointmentsDentistAndSalary(
    appointments: Appointment[],
    dentistId: number,
  ): Promise<Map<number, { dentist: { id: number; name: string; surname: string } | null; treatmentPercentage: number | null; dentistCalculatedFee: number }>> {
    const resultMap = new Map<number, { dentist: { id: number; name: string; surname: string } | null; treatmentPercentage: number | null; dentistCalculatedFee: number }>();
    
    const dentistRepo = this.dataSource.getRepository(Dentist);
    const salaryRepo = this.dataSource.getRepository(Salary);

    const dentist = await dentistRepo.findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });

    const salary = dentist?.staff ? await salaryRepo.findOne({
      where: { staffId: dentist.staff.id },
    }) : null;

    const dentistInfo = dentist && dentist.staff ? {
      id: dentist.id,
      name: dentist.staff.name,
      surname: dentist.staff.surname,
    } : null;

    // Fetch all appointments with their tooth treatments in one query using QueryBuilder
    const appointmentIds = appointments.map(a => a.id);
    if (appointmentIds.length === 0) {
      return resultMap;
    }

    const appointmentsWithTreatments = await this.repo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.toothTreatments', 'toothTreatments')
      .leftJoinAndSelect('toothTreatments.dentist', 'dentist')
      .leftJoinAndSelect('toothTreatments.treatment', 'treatment')
      .leftJoinAndSelect('toothTreatments.toothTreatmentMedicines', 'medicines')
      .leftJoinAndSelect('medicines.medicineEntity', 'medicineEntity')
      .where('appointment.id IN (:...appointmentIds)', { appointmentIds })
      .getMany();

    // Build a map for quick lookup
    const appointmentMap = new Map<number, Appointment>();
    appointmentsWithTreatments.forEach(apt => appointmentMap.set(apt.id, apt));

    // Calculate fees for each appointment
    for (const appointment of appointments) {
      const appointmentWithTreatments = appointmentMap.get(appointment.id);
      let dentistCalculatedFee = 0;

      if (appointmentWithTreatments?.toothTreatments) {
        dentistCalculatedFee = appointmentWithTreatments.toothTreatments
          .filter(tt => tt.dentist.id === dentistId)
          .reduce((total, toothTreatment) => {
            const treatmentFee = toothTreatment.feeSnapshot ?? (toothTreatment.treatment?.price || 0);
            const medicineFee = (toothTreatment.toothTreatmentMedicines ?? []).reduce((medicineTotal, medicine) => {
              const unitPrice = medicine.medicinePriceSnapshot ?? (medicine.medicineEntity?.price || 0);
              const quantity = Math.max(1, medicine.quantity || 1);
              return medicineTotal + (unitPrice * quantity);
            }, 0);
            return total + treatmentFee + medicineFee;
          }, 0);
      }

      resultMap.set(appointment.id, {
        dentist: dentistInfo,
        treatmentPercentage: salary?.treatmentPercentage ?? null,
        dentistCalculatedFee,
      });
    }

    return resultMap;
  }
}
