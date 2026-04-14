import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Dentist } from './entities/dentist.entity';
import { LogWriter } from '../log-writer';
import { Staff } from '../staff/entities/staff.entity';
import { GetDentistDto } from './dto/get-dentist.dto';

@Injectable()
export class DentistRepository {
  private readonly logger = new Logger(DentistRepository.name);

  constructor(private readonly dataSource: DataSource) {}

  findAll() {
    this.logger.debug('findAll called');
    LogWriter.append('debug', DentistRepository.name, 'findAll called');
    return [];
  }

  async findAllByClinicWithFilters(
    clinicId: number,
    filters: GetDentistDto,
  ): Promise<Dentist[]> {
    const repository = this.dataSource.getRepository(Dentist);
    const qb = repository
      .createQueryBuilder('dentist')
      .leftJoinAndSelect('dentist.staff', 'staff')
      .where('staff.clinicId = :clinicId', { clinicId });

    if (filters.id !== undefined) {
      qb.andWhere('dentist.id = :id', { id: filters.id });
    }
    if (filters.name !== undefined) {
      qb.andWhere('LOWER(staff.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`,
      });
    }
    if (filters.surname !== undefined) {
      qb.andWhere('LOWER(staff.surname) LIKE LOWER(:surname)', {
        surname: `%${filters.surname}%`,
      });
    }
    if (filters.birthDate !== undefined) {
      qb.andWhere('staff.birthDate = :birthDate', {
        birthDate: filters.birthDate,
      });
    }
    if (filters.gmail !== undefined) {
      qb.andWhere('LOWER(staff.gmail) LIKE LOWER(:gmail)', {
        gmail: `%${filters.gmail}%`,
      });
    }

    return await qb.getMany();
  }

  async findById(id: number): Promise<Dentist | null> {
    this.logger.debug(`findById called with id ${id}`);
    LogWriter.append(
      'debug',
      DentistRepository.name,
      `findById called with id ${id}`,
    );
    const repository = this.dataSource.getRepository(Dentist);
    return repository.findOne({ where: { id }, relations: ['staff'] });
  }

  async update(id: number, updates: Partial<Dentist>): Promise<Dentist> {
    this.logger.debug(`update called with id ${id}`);
    LogWriter.append(
      'debug',
      DentistRepository.name,
      `update called with id ${id}`,
    );
    const repository = this.dataSource.getRepository(Dentist);
    const current = await repository.findOne({
      where: { id },
      relations: ['staff'],
    });
    if (!current) {
      throw new Error(`Dentist with id ${id} not found before update`);
    }
    const merged = repository.merge(current, updates);
    await repository.save(merged);
    const updated = await repository.findOne({
      where: { id },
      relations: ['staff'],
    });
    if (!updated) {
      throw new Error(`Dentist with id ${id} not found after update`);
    }
    this.logger.log(`Dentist with id ${id} updated`);
    LogWriter.append(
      'log',
      DentistRepository.name,
      `Dentist with id ${id} updated`,
    );
    return updated;
  }

  async createWithStaff(input: Partial<Staff>): Promise<Dentist> {
    const staffRepo = this.dataSource.getRepository(Staff);
    const dentistRepo = this.dataSource.getRepository(Dentist);

    const staff = await staffRepo.save(staffRepo.create(input));
    const dentist = await dentistRepo.save(
      dentistRepo.create({
        staffId: staff.id,
      }),
    );

    return await dentistRepo.findOneOrFail({
      where: { id: dentist.id },
      relations: ['staff'],
    });
  }

  async findStaffById(staffId: number): Promise<Staff | null> {
    return await this.dataSource.getRepository(Staff).findOne({
      where: { id: staffId },
    });
  }

  async findByStaffId(staffId: number): Promise<Dentist | null> {
    return await this.dataSource.getRepository(Dentist).findOne({
      where: { staffId },
      relations: ['staff'],
    });
  }

  async createWithExistingStaff(staffId: number): Promise<Dentist> {
    const dentistRepo = this.dataSource.getRepository(Dentist);
    const created = await dentistRepo.save(
      dentistRepo.create({
        staffId,
      }),
    );

    return await dentistRepo.findOneOrFail({
      where: { id: created.id },
      relations: ['staff'],
    });
  }

  async removeById(id: number): Promise<Dentist | null> {
    const repository = this.dataSource.getRepository(Dentist);
    const entity = await repository.findOne({
      where: { id },
      relations: ['staff'],
    });
    if (!entity) {
      return null;
    }

    await repository.remove(entity);
    return entity;
  }
}
