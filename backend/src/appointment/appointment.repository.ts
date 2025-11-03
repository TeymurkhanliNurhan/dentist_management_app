import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class AppointmentRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Appointment> {
        return this.dataSource.getRepository(Appointment);
    }

    async createAppointmentForDentist(dentistId: number, input: { startDate: Date; endDate: Date | null; discountFee: number | null }): Promise<Appointment> {
        const dentist = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId } });
        if (!dentist) throw new Error('Dentist not found');
        const appointment = this.repo.create({ ...input, dentist });
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
}


