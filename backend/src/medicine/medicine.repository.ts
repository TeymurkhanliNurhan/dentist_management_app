import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Medicine } from './entities/medicine.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class MedicineRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Medicine> {
        return this.dataSource.getRepository(Medicine);
    }

    async createMedicineForDentist(dentistId: number, input: { name: string; description: string; price: number }): Promise<Medicine> {
        const dentist = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId } });
        if (!dentist) throw new Error('Dentist not found');
        const med = this.repo.create({ ...input, dentist });
        return await this.repo.save(med);
    }

    async updateMedicineEnsureOwnership(dentistId: number, id: number, updates: Partial<{ name: string; description: string; price: number }>): Promise<Medicine> {
        const med = await this.repo.findOne({ where: { id, dentist: { id: dentistId } } });
        if (!med) throw new Error('Forbidden');
        if (updates.name !== undefined) med.name = updates.name;
        if (updates.description !== undefined) med.description = updates.description;
        if (updates.price !== undefined) med.price = updates.price;
        return await this.repo.save(med);
    }

    async findMedicinesForDentist(
        dentistId: number,
        filters: { id?: number; name?: string },
    ): Promise<Medicine[]> {
        const queryBuilder = this.repo
            .createQueryBuilder('medicine')
            .where('medicine.dentist = :dentistId', { dentistId });

        if (filters.id !== undefined) {
            queryBuilder.andWhere('medicine.id = :id', { id: filters.id });
        }
        if (filters.name !== undefined) {
            queryBuilder.andWhere('LOWER(medicine.name) LIKE LOWER(:name)', { name: `%${filters.name}%` });
        }

        return await queryBuilder.getMany();
    }
}

