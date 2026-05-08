import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DentistTreatment } from './entities/dentist_treatment.entity';
import { Treatment } from '../treatment/entities/treatment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class DentistTreatmentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<DentistTreatment> {
    return this.dataSource.getRepository(DentistTreatment);
  }

  async createLink(
    treatment: number,
    dentist: number,
  ): Promise<DentistTreatment> {
    const treatmentExists = await this.dataSource
      .getRepository(Treatment)
      .exist({ where: { id: treatment } });
    if (!treatmentExists) throw new Error('Treatment not found');

    const dentistExists = await this.dataSource
      .getRepository(Dentist)
      .exist({ where: { id: dentist } });
    if (!dentistExists) throw new Error('Dentist not found');

    const existing = await this.repo.findOne({ where: { treatment, dentist } });
    if (existing) {
      if (existing.active) {
        throw new Error('Already exists');
      }
      // If inactive, reactivate it
      existing.active = true;
      return await this.repo.save(existing);
    }

    const created = this.repo.create({ treatment, dentist, active: true });
    return await this.repo.save(created);
  }

  async deleteLink(treatment: number, dentist: number): Promise<void> {
    const result = await this.repo.update(
      { treatment, dentist },
      { active: false }
    );
    if (!result.affected) throw new Error('Not found');
  }

  async findAll(filters: {
    treatment?: number;
    dentist?: number;
  }): Promise<DentistTreatment[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('dt')
      .leftJoinAndSelect('dt.treatmentEntity', 'treatmentEntity')
      .leftJoinAndSelect('dt.dentistEntity', 'dentistEntity')
      .where('dt.active = :active', { active: true });

    if (filters.treatment !== undefined) {
      queryBuilder.andWhere('dt.treatment = :treatment', {
        treatment: filters.treatment,
      });
    }

    if (filters.dentist !== undefined) {
      queryBuilder.andWhere('dt.dentist = :dentist', {
        dentist: filters.dentist,
      });
    }

    return await queryBuilder.getMany();
  }
}
