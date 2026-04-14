import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Treatment } from './entities/treatment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Clinic } from '../clinic/entities/clinic.entity';

@Injectable()
export class TreatmentRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Treatment> {
        return this.dataSource.getRepository(Treatment);
    }

    async createTreatmentForDentist(
        dentistId: number,
        input: { name: string; price: number; description: string; pricePer?: Treatment['pricePer'] },
    ): Promise<Treatment> {
        const dentist = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId }, relations: ['staff'] });
        if (!dentist?.staff) throw new Error('Dentist not found');
        const clinicId = dentist.staff.clinicId;
        const treatment = this.repo.create({
            name: input.name,
            price: input.price,
            description: input.description,
            pricePer: input.pricePer ?? null,
            clinic: { id: clinicId } as Clinic,
        });
        return await this.repo.save(treatment);
    }

    async updateTreatmentEnsureOwnership(
        dentistId: number,
        id: number,
        updates: Partial<{ name: string; price: number; description: string; pricePer: Treatment['pricePer'] }>,
    ): Promise<Treatment> {
        const dentist = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId }, relations: ['staff'] });
        if (!dentist?.staff) throw new Error('Dentist not found');
        const clinicId = dentist.staff.clinicId;
        const treatment = await this.repo.findOne({ where: { id, clinic: { id: clinicId } } });
        if (!treatment) throw new Error('Forbidden');
        if (updates.name !== undefined) treatment.name = updates.name;
        if (updates.price !== undefined) treatment.price = updates.price;
        if (updates.description !== undefined) treatment.description = updates.description;
        if (updates.pricePer !== undefined) treatment.pricePer = updates.pricePer;
        return await this.repo.save(treatment);
    }

    async findTreatmentsForDentist(
        dentistId: number,
        filters: { id?: number; name?: string },
    ): Promise<Treatment[]> {
        const dentist = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId }, relations: ['staff'] });
        if (!dentist?.staff) throw new Error('Dentist not found');
        const clinicId = dentist.staff.clinicId;
        const queryBuilder = this.repo
            .createQueryBuilder('treatment')
            .where('treatment.clinicId = :clinicId', { clinicId });

        if (filters.id !== undefined) {
            queryBuilder.andWhere('treatment.id = :id', { id: filters.id });
        }
        if (filters.name !== undefined) {
            queryBuilder.andWhere('LOWER(treatment.name) LIKE LOWER(:name)', { name: `%${filters.name}%` });
        }

        return await queryBuilder.getMany();
    }
}


