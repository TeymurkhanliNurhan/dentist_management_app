import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Patient } from '../patient/entities/patient.entity';

@Injectable()
export class AppointmentRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Appointment> {
        return this.dataSource.getRepository(Appointment);
    }

    async createAppointmentForDentistAndPatient(dentistId: number, patientId: number, input: { startDate: Date; endDate: Date | null; discountFee: number | null }): Promise<Appointment> {
        const dentistRepo = this.dataSource.getRepository(Dentist);
        const patientRepo = this.dataSource.getRepository(Patient);
        const [dentist, patient] = await Promise.all([
            dentistRepo.findOne({ where: { id: dentistId } }),
            patientRepo.findOne({ where: { id: patientId }, relations: ['dentist'] }),
        ]);
        if (!dentist) throw new Error('Dentist not found');
        if (!patient) throw new Error('Patient not found');
        if (patient.dentist?.id !== dentistId) throw new Error('Forbidden');
        const appointment = this.repo.create({ ...input, dentist, patient });
        return await this.repo.save(appointment);
    }

    async updateAppointmentEnsureOwnership(dentistId: number, id: number, updates: Partial<{ startDate: Date; endDate: Date | null; discountFee: number | null }>): Promise<Appointment> {
        const appointment = await this.repo.findOne({ where: { id, dentist: { id: dentistId } } });
        if (!appointment) throw new Error('Forbidden');
        if (updates.startDate !== undefined) appointment.startDate = updates.startDate;
        if (updates.endDate !== undefined) appointment.endDate = updates.endDate;
        if (updates.discountFee !== undefined) appointment.discountFee = updates.discountFee;
        return await this.repo.save(appointment);
    }

    async deleteAppointmentEnsureOwnership(dentistId: number, id: number): Promise<void> {
        const appointment = await this.repo.findOne({ where: { id, dentist: { id: dentistId } } });
        if (!appointment) throw new Error('Forbidden');
        await this.repo.remove(appointment);
    }

    async findAppointmentsForDentist(
        dentistId: number,
        filters: { id?: number; startDate?: string; endDate?: string; patient?: number; patientName?: string; patientSurname?: string; page?: number; limit?: number },
    ): Promise<{ appointments: Appointment[]; total: number }> {
        const queryBuilder = this.repo
            .createQueryBuilder('appointment')
            .leftJoinAndSelect('appointment.patient', 'patient')
            .where('appointment.dentist = :dentistId', { dentistId });

        if (filters.id !== undefined) {
            queryBuilder.andWhere('appointment.id = :id', { id: filters.id });
        }
        if (filters.startDate !== undefined) {
            queryBuilder.andWhere('appointment.startDate = :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate !== undefined) {
            queryBuilder.andWhere('appointment.endDate = :endDate', { endDate: filters.endDate });
        }
        if (filters.patient !== undefined) {
            queryBuilder.andWhere('appointment.patient = :patient', { patient: filters.patient });
        }
        if (filters.patientName !== undefined) {
            queryBuilder.andWhere('LOWER(patient.name) LIKE LOWER(:patientName)', { patientName: `%${filters.patientName}%` });
        }
        if (filters.patientSurname !== undefined) {
            queryBuilder.andWhere('LOWER(patient.surname) LIKE LOWER(:patientSurname)', { patientSurname: `%${filters.patientSurname}%` });
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

        return { appointments, total };
    }
}


