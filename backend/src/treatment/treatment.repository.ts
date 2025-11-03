import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Treatment } from './entities/treatment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class TreatmentRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Treatment> {
        return this.dataSource.getRepository(Treatment);
    }

    async createTreatmentForDentist(dentistId: number, input: { name: string; price: number; description: string }): Promise<Treatment> {
        const dentist = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId } });
        if (!dentist) throw new Error('Dentist not found');
        const treatment = this.repo.create({ ...input, dentist });
        return await this.repo.save(treatment);
    }

    async updateTreatmentEnsureOwnership(dentistId: number, id: number, updates: Partial<{ name: string; price: number; description: string }>): Promise<Treatment> {
        const treatment = await this.repo.findOne({ where: { id, dentist: { id: dentistId } } });
        if (!treatment) throw new Error('Forbidden');
        if (updates.name !== undefined) treatment.name = updates.name;
        if (updates.price !== undefined) treatment.price = updates.price;
        if (updates.description !== undefined) treatment.description = updates.description;
        return await this.repo.save(treatment);
    }
}


