import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class RoomRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<Room> {
    return this.dataSource.getRepository(Room);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff?.clinicId) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  async createForDentist(
    dentistId: number,
    input: { number: string; description: string },
  ): Promise<Room> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const created = this.repo.create({
      number: input.number,
      description: input.description,
      clinicId,
      dentistId,
    });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: { id?: number; number?: string },
  ): Promise<Room[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('room')
      .where('room.clinicId = :clinicId', { clinicId })
      .andWhere('room.dentistId = :dentistId', { dentistId });

    if (filters.id !== undefined) qb.andWhere('room.id = :id', { id: filters.id });
    if (filters.number !== undefined) {
      qb.andWhere('LOWER(room.number) LIKE LOWER(:number)', {
        number: `%${filters.number}%`,
      });
    }

    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: { number?: string; description?: string },
  ): Promise<Room> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo.findOne({
      where: { id, clinicId, dentistId },
    });
    if (!existing) throw new Error('Forbidden');

    if (updates.number !== undefined) existing.number = updates.number;
    if (updates.description !== undefined) existing.description = updates.description;

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo.findOne({
      where: { id, clinicId, dentistId },
    });
    if (!existing) throw new Error('Forbidden');
    await this.repo.remove(existing);
  }
}
