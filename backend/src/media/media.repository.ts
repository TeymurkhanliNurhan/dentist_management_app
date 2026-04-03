import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { ToothTreatment } from '../tooth_treatment/entities/tooth_treatment.entity';
import { LogWriter } from '../log-writer';

@Injectable()
export class MediaRepository {
    private readonly logger = new Logger(MediaRepository.name);

    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<Media> {
        return this.dataSource.getRepository(Media);
    }

    async findAll(filters: { id?: number; name?: string; Tooth_Treatment_id?: number; page?: number; limit?: number }): Promise<{ medias: Media[]; total: number }> {
        this.logger.debug('findAll called');
        LogWriter.append('debug', MediaRepository.name, 'findAll called');

        const queryBuilder = this.repo.createQueryBuilder('media')
            .leftJoinAndSelect('media.toothTreatment', 'toothTreatment');

        if (filters.id) {
            queryBuilder.andWhere('media.id = :id', { id: filters.id });
        }
        if (filters.name) {
            queryBuilder.andWhere('media.name ILIKE :name', { name: `%${filters.name}%` });
        }
        if (filters.Tooth_Treatment_id) {
            queryBuilder.andWhere('media.Tooth_Treatment_id = :toothTreatmentId', { toothTreatmentId: filters.Tooth_Treatment_id });
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
        LogWriter.append('debug', MediaRepository.name, `findById called with id ${id}`);
        return this.repo.findOne({ where: { id }, relations: ['toothTreatment'] });
    }

    async create(input: { photo_url: number; name: string; description?: string; Tooth_Treatment_id: number }): Promise<Media> {
        this.logger.debug('create called');
        LogWriter.append('debug', MediaRepository.name, 'create called');

        const toothTreatmentRepo = this.dataSource.getRepository(ToothTreatment);
        const toothTreatment = await toothTreatmentRepo.findOne({ where: { id: input.Tooth_Treatment_id } });
        if (!toothTreatment) throw new Error('Tooth Treatment not found');

        const media = this.repo.create({
            photo_url: input.photo_url,
            name: input.name,
            description: input.description || null,
            toothTreatment,
        });
        return await this.repo.save(media);
    }

    async update(id: number, updates: Partial<{ photo_url: number; name: string; description: string; Tooth_Treatment_id: number }>): Promise<Media> {
        this.logger.debug(`update called with id ${id}`);
        LogWriter.append('debug', MediaRepository.name, `update called with id ${id}`);

        const media = await this.repo.findOne({ where: { id } });
        if (!media) throw new Error('Media not found');

        if (updates.photo_url !== undefined) media.photo_url = updates.photo_url;
        if (updates.name !== undefined) media.name = updates.name;
        if (updates.description !== undefined) media.description = updates.description;
        if (updates.Tooth_Treatment_id !== undefined) {
            const toothTreatmentRepo = this.dataSource.getRepository(ToothTreatment);
            const toothTreatment = await toothTreatmentRepo.findOne({ where: { id: updates.Tooth_Treatment_id } });
            if (!toothTreatment) throw new Error('Tooth Treatment not found');
            media.toothTreatment = toothTreatment;
        }

        return await this.repo.save(media);
    }

    async delete(id: number): Promise<void> {
        this.logger.debug(`delete called with id ${id}`);
        LogWriter.append('debug', MediaRepository.name, `delete called with id ${id}`);

        const media = await this.repo.findOne({ where: { id } });
        if (!media) throw new Error('Media not found');

        await this.repo.remove(media);
    }
}