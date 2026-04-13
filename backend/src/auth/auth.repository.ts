import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';
import { LogWriter } from '../log-writer';
import { Staff } from '../staff/entities/staff.entity';
import { Clinic } from '../clinic/entities/clinic.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(AuthRepository.name);

  private getDentistRepository(): Repository<Dentist> {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database connection is not initialized');
    }
    return this.dataSource.getRepository(Dentist);
  }

  private getStaffRepository(): Repository<Staff> {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database connection is not initialized');
    }
    return this.dataSource.getRepository(Staff);
  }

  /**
   * Auth identity (email, password, verification) lives on Staff.
   * JWT and API still use the Dentist row id (`user.id` / `dentistId`) as before.
   */
  async findUserByEmail(email: string): Promise<Dentist | null> {
    const staffRepository = this.getStaffRepository();
    const staff = await staffRepository.findOne({
      where: { gmail: email },
      relations: ['dentist'],
    });
    if (!staff?.dentist) {
      this.logger.debug('findUserByEmail: no staff/dentist for email');
      LogWriter.append('debug', AuthRepository.name, 'findUserByEmail: no staff/dentist for email');
      return null;
    }
    staff.dentist.staff = staff;
    this.logger.debug('findUserByEmail executed');
    LogWriter.append('debug', AuthRepository.name, 'findUserByEmail executed');
    return staff.dentist;
  }

  async createUser(payload: {
    name: string;
    surname: string;
    birthDate: Date;
    gmail: string;
    password: string;
    isEmailVerified: boolean;
    verificationCode: string | null;
    verificationCodeExpiry: Date | null;
  }): Promise<Dentist> {
    const dentistRepository = this.getDentistRepository();
    const staffRepository = this.getStaffRepository();
    const clinicRepository = this.dataSource.getRepository(Clinic);

    const existingClinic = await clinicRepository.findOne({ where: {} });
    const clinic =
      existingClinic ??
      (await clinicRepository.save(
        clinicRepository.create({
          name: 'Default clinic',
          address: 'Baku',
        }),
      ));

    const staff = await staffRepository.save(
      staffRepository.create({
        name: payload.name,
        surname: payload.surname,
        birthDate: payload.birthDate,
        gmail: payload.gmail,
        password: payload.password,
        isEmailVerified: payload.isEmailVerified,
        verificationCode: payload.verificationCode,
        verificationCodeExpiry: payload.verificationCodeExpiry,
        active: true,
        startDate: new Date(),
        endDate: null,
        clinicId: clinic.id,
      }),
    );

    const saved = await dentistRepository.save(
      dentistRepository.create({
        staffId: staff.id,
      }),
    );
    this.logger.log(`Dentist persisted with id ${saved.id}`);
    LogWriter.append('log', AuthRepository.name, `Dentist persisted with id ${saved.id}`);
    return dentistRepository.findOneOrFail({ where: { id: saved.id }, relations: ['staff'] });
  }

  async updateUser(id: number, updates: Partial<Staff>): Promise<Dentist> {
    const dentistRepository = this.getDentistRepository();
    const dentist = await dentistRepository.findOne({ where: { id }, relations: ['staff'] });
    if (!dentist) {
      throw new Error(`Dentist with id ${id} not found`);
    }

    const staffRepository = this.getStaffRepository();
    await staffRepository.update(dentist.staffId, updates);
    const updated = await dentistRepository.findOne({ where: { id }, relations: ['staff'] });
    if (!updated) {
      throw new Error(`Dentist with id ${id} not found after update`);
    }
    this.logger.log(`Dentist with id ${id} updated`);
    LogWriter.append('log', AuthRepository.name, `Dentist with id ${id} updated`);
    return updated;
  }
}
