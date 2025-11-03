import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Medicine } from './entities/medicine.entity';

@Injectable()
export class MedicineRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Medicine> {
        return this.dataSource.getRepository(Medicine);
    }

    async createMedicine(input: { name: string; description: string; price: number }): Promise<Medicine> {
        const med = this.repo.create(input);
        return await this.repo.save(med);
    }

    async updateMedicine(id: number, updates: Partial<{ name: string; description: string; price: number }>): Promise<Medicine> {
        const med = await this.repo.findOne({ where: { id } });
        if (!med) throw new Error('Medicine not found');
        if (updates.name !== undefined) med.name = updates.name;
        if (updates.description !== undefined) med.description = updates.description;
        if (updates.price !== undefined) med.price = updates.price;
        return await this.repo.save(med);
    }
}

