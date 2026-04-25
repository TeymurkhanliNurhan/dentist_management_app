import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { ToothTreatment } from '../tooth_treatment/entities/tooth_treatment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { LogWriter } from '../log-writer';

@Injectable()
export class MediaRepository {
  private readonly logger = new Logger(MediaRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Media> {
    return this.dataSource.getRepository(Media);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource
      .getRepository(Dentist)
      .findOne({ where: { id: dentistId }, relations: ['staff'] });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  async assertUserMayMutateToothTreatment(opts: {
    contextDentistId: number;
    userRole?: string | null;
    toothTreatmentId: number;
  }): Promise<void> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);
    const tt = await ttRepo.findOne({
      where: { id: opts.toothTreatmentId },
      relations: ['appointment', 'dentist'],
    });
    if (!tt) throw new Error('Tooth Treatment not found');
    const clinicId = await this.getClinicIdForDentist(opts.contextDentistId);
    if (tt.appointment?.clinicId !== clinicId) throw new Error('Forbidden');
    if (
      (opts.userRole ?? '').toLowerCase() === 'dentist' &&
      (tt.dentist == null || tt.dentist.id !== opts.contextDentistId)
    ) {
      throw new Error('Forbidden');
    }
  }

  async findAll(filters: {
    id?: number;
    name?: string;
    tooth_treatment_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{ medias: Media[]; total: number }> {
    this.logger.debug('findAll called');
    LogWriter.append('debug', MediaRepository.name, 'findAll called');

    const queryBuilder = this.repo
      .createQueryBuilder('media')
      .leftJoinAndSelect('media.toothTreatment', 'toothTreatment');

    if (filters.id) {
      queryBuilder.andWhere('media.id = :id', { id: filters.id });
    }
    if (filters.name) {
      queryBuilder.andWhere('media.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }
    if (filters.tooth_treatment_id) {
      queryBuilder.andWhere('toothTreatment.id = :toothTreatmentId', {
        toothTreatmentId: filters.tooth_treatment_id,
      });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [medias, total] = await queryBuilder.getManyAndCount();
    return { medias, total };
  }

  async findById(id: number): Promise<Media | null> {
    this.logger.debug(`findById called with id ${id}`);
    LogWriter.append(
      'debug',
      MediaRepository.name,
      `findById called with id ${id}`,
    );
    return this.repo.findOne({ where: { id }, relations: ['toothTreatment'] });
  }

  async create(input: {
    photo_url: string;
    name: string;
    description?: string;
    tooth_treatment_id: number;
  }): Promise<Media> {
    this.logger.debug('create called');
    LogWriter.append('debug', MediaRepository.name, 'create called');

    const toothTreatmentRepo = this.dataSource.getRepository(ToothTreatment);
    const toothTreatment = await toothTreatmentRepo.findOne({
      where: { id: input.tooth_treatment_id },
    });
    if (!toothTreatment) throw new Error('Tooth Treatment not found');

    const media = this.repo.create({
      photo_url: input.photo_url,
      name: input.name,
      description: input.description || null,
      toothTreatment,
    });
    return await this.repo.save(media);
  }

  async update(
    id: number,
    updates: Partial<{
      photo_url: string;
      name: string;
      description: string;
      tooth_treatment_id: number;
    }>,
  ): Promise<Media> {
    this.logger.debug(`update called with id ${id}`);
    LogWriter.append(
      'debug',
      MediaRepository.name,
      `update called with id ${id}`,
    );

    const media = await this.repo.findOne({ where: { id } });
    if (!media) throw new Error('Media not found');

    if (updates.photo_url !== undefined) media.photo_url = updates.photo_url;
    if (updates.name !== undefined) media.name = updates.name;
    if (updates.description !== undefined)
      media.description = updates.description;
    if (updates.tooth_treatment_id !== undefined) {
      const toothTreatmentRepo = this.dataSource.getRepository(ToothTreatment);
      const toothTreatment = await toothTreatmentRepo.findOne({
        where: { id: updates.tooth_treatment_id },
      });
      if (!toothTreatment) throw new Error('Tooth Treatment not found');
      media.toothTreatment = toothTreatment;
    }

    return await this.repo.save(media);
  }

  async delete(id: number): Promise<void> {
    this.logger.debug(`delete called with id ${id}`);
    LogWriter.append(
      'debug',
      MediaRepository.name,
      `delete called with id ${id}`,
    );

    const media = await this.repo.findOne({ where: { id } });
    if (!media) throw new Error('Media not found');

    await this.repo.remove(media);
  }
}
