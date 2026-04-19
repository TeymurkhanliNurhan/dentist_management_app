import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BlockingHours } from './entities/blocking_hours.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Room } from '../room/entities/room.entity';

@Injectable()
export class BlockingHoursRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<BlockingHours> {
    return this.dataSource.getRepository(BlockingHours);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  private async ensureStaffInClinic(staffId: number, clinicId: number) {
    const staff = await this.dataSource.getRepository(Staff).findOne({
      where: { id: staffId, clinicId },
    });
    if (!staff) throw new Error('Staff not found');
  }

  private async ensureRoomInClinic(roomId: number, clinicId: number) {
    const room = await this.dataSource.getRepository(Room).findOne({
      where: { id: roomId, clinicId },
    });
    if (!room) throw new Error('Room not found');
  }

  async getStaffDisplayName(
    staffId: number,
    contextDentistId: number,
  ): Promise<string> {
    const clinicId = await this.getClinicIdForDentist(contextDentistId);
    const staff = await this.dataSource.getRepository(Staff).findOne({
      where: { id: staffId, clinicId },
    });
    if (!staff) throw new Error('Staff not found');
    return `${staff.name ?? ''} ${staff.surname ?? ''}`.trim();
  }

  async createForDentist(
    dentistId: number,
    input: {
      startTime: string;
      endTime: string;
      staffId?: number;
      roomId?: number;
      name?: string | null;
    },
  ): Promise<BlockingHours> {
    const clinicId = await this.getClinicIdForDentist(dentistId);

    if (input.staffId !== undefined && input.staffId !== null)
      await this.ensureStaffInClinic(input.staffId, clinicId);
    if (input.roomId !== undefined && input.roomId !== null)
      await this.ensureRoomInClinic(input.roomId, clinicId);

    const created = this.repo.create({
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      staffId: input.staffId ?? null,
      roomId: input.roomId ?? null,
      name: input.name ?? null,
    });
    return await this.repo.save(created);
  }

  async findForDentist(
    dentistId: number,
    filters: {
      id?: number;
      startTime?: string;
      endTime?: string;
      staffId?: number;
      roomId?: number;
    },
  ): Promise<BlockingHours[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const qb = this.repo
      .createQueryBuilder('bh')
      .leftJoinAndSelect('bh.staff', 'staff')
      .leftJoinAndSelect('bh.room', 'room')
      .where(
        '(staff.id IS NULL OR staff.clinicId = :clinicId) AND (room.id IS NULL OR room.clinicId = :clinicId)',
        { clinicId },
      );

    if (filters.id !== undefined)
      qb.andWhere('bh.id = :id', { id: filters.id });
    if (filters.staffId !== undefined)
      qb.andWhere('bh.staffId = :staffId', { staffId: filters.staffId });
    if (filters.roomId !== undefined)
      qb.andWhere('bh.roomId = :roomId', { roomId: filters.roomId });
    if (filters.startTime !== undefined)
      qb.andWhere('bh.startTime = :startTime', {
        startTime: filters.startTime,
      });
    if (filters.endTime !== undefined)
      qb.andWhere('bh.endTime = :endTime', { endTime: filters.endTime });

    return await qb.getMany();
  }

  async updateForDentist(
    dentistId: number,
    id: number,
    updates: {
      startTime?: string;
      endTime?: string;
      staffId?: number;
      roomId?: number;
      name?: string | null;
    },
  ): Promise<BlockingHours> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('bh')
      .leftJoin('bh.staff', 'staff')
      .leftJoin('bh.room', 'room')
      .where('bh.id = :id', { id })
      .andWhere(
        '(staff.id IS NULL OR staff.clinicId = :clinicId) AND (room.id IS NULL OR room.clinicId = :clinicId)',
        { clinicId },
      )
      .getOne();
    if (!existing) throw new Error('Forbidden');

    if (updates.staffId !== undefined) {
      await this.ensureStaffInClinic(updates.staffId, clinicId);
      existing.staffId = updates.staffId;
    }
    if (updates.roomId !== undefined) {
      await this.ensureRoomInClinic(updates.roomId, clinicId);
      existing.roomId = updates.roomId;
    }
    if (updates.startTime !== undefined)
      existing.startTime = new Date(updates.startTime);
    if (updates.endTime !== undefined)
      existing.endTime = new Date(updates.endTime);
    if (updates.name !== undefined) existing.name = updates.name;

    return await this.repo.save(existing);
  }

  async deleteForDentist(dentistId: number, id: number): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const existing = await this.repo
      .createQueryBuilder('bh')
      .leftJoin('bh.staff', 'staff')
      .leftJoin('bh.room', 'room')
      .where('bh.id = :id', { id })
      .andWhere(
        '(staff.id IS NULL OR staff.clinicId = :clinicId) AND (room.id IS NULL OR room.clinicId = :clinicId)',
        { clinicId },
      )
      .getOne();
    if (!existing) throw new Error('Forbidden');

    await this.repo.remove(existing);
  }
}
