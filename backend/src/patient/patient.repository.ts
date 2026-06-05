import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Clinic } from '../clinic/entities/clinic.entity';

@Injectable()
export class PatientRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get patientRepo(): Repository<Patient> {
    return this.dataSource.getRepository(Patient);
  }

  async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource.getRepository(Dentist).findOne({
      where: { id: dentistId },
      relations: ['staff'],
    });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  async getNextPatientId(): Promise<number> {
    const result = await this.patientRepo
      .createQueryBuilder('p')
      .select('MAX(p.id)', 'max')
      .getRawOne<{ max: number | null }>();
    const max = result?.max ?? 0;
    return Number(max) + 1;
  }

  async createPatientForDentist(
    dentistId: number,
    input: { name: string; surname: string; birthDate: Date; phone?: string; password?: string },
  ): Promise<{ patient: Patient; clinicId: number }> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const clinicRef = await this.dataSource
      .getRepository(Clinic)
      .findOne({ where: { id: clinicId } });
    if (!clinicRef) throw new Error('Dentist not found');
    // const nextId = await this.getNextPatientId();
    const saved = await this.patientRepo.save({
      name: input.name,
      surname: input.surname,
      birthDate: input.birthDate,
      phone: input.phone ?? null,
      password: input.password ?? null,
      clinic: clinicRef,
    } as Partial<Patient>);
    return { patient: saved, clinicId };
  }

  async updatePatientEnsureOwnership(
    dentistId: number,
    id: number,
    updates: Partial<{ name: string; surname: string; birthDate: Date; phone?: string; password?: string }>,
  ): Promise<Patient> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const patient = await this.patientRepo.findOne({
      where: { id, clinic: { id: clinicId } },
    });
    if (!patient) throw new Error('Forbidden');
    if (updates.name !== undefined) patient.name = updates.name;
    if (updates.surname !== undefined) patient.surname = updates.surname;
    if (updates.birthDate !== undefined) patient.birthDate = updates.birthDate;
    if (updates.phone !== undefined) patient.phone = updates.phone;
    if (updates.password !== undefined) patient.password = updates.password;
    return await this.patientRepo.save(patient);
  }

  async findPatientsForDentist(
    dentistId: number,
    filters: {
      id?: number;
      name?: string;
      surname?: string;
      birthdate?: string;
      number?: string;
    },
  ): Promise<Patient[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const queryBuilder = this.patientRepo
      .createQueryBuilder('patient')
      .where('patient.clinicId = :clinicId', { clinicId });

    if (filters.id !== undefined) {
      queryBuilder.andWhere('patient.id = :id', { id: filters.id });
    }
    if (filters.name !== undefined) {
      queryBuilder.andWhere('LOWER(patient.name) LIKE LOWER(:name)', {
        name: `${filters.name}%`,
      });
    }
    if (filters.surname !== undefined) {
      queryBuilder.andWhere('LOWER(patient.surname) LIKE LOWER(:surname)', {
        surname: `${filters.surname}%`,
      });
    }
    if (filters.birthdate !== undefined) {
      queryBuilder.andWhere('patient.birthDate = :birthDate', {
        birthDate: filters.birthdate,
      });
    }
    if (filters.number !== undefined) {
      queryBuilder.andWhere('patient.phone LIKE :phone', {
        phone: `${filters.number}%`,
      });
    }

    return await queryBuilder.getMany();
  }

  async deletePatientEnsureOwnership(
    dentistId: number,
    id: number,
  ): Promise<void> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const patient = await this.patientRepo.findOne({
      where: { id, clinic: { id: clinicId } },
    });
    if (!patient) throw new Error('Forbidden');
    await this.patientRepo.remove(patient);
  }

  async findPatientByPhoneAndClinic(
    phone: string,
    clinicId: number,
  ): Promise<Patient | null> {
    return await this.patientRepo.findOne({
      where: { phone, clinic: { id: clinicId } },
      relations: ['clinic'],
    });
  }

  async createPatientWithAuth(input: {
    name: string;
    surname: string;
    phone: string;
    password: string;
    clinicId: number;
  }): Promise<Patient> {
    const clinic = await this.dataSource.getRepository(Clinic).findOne({
      where: { id: input.clinicId },
    });
    if (!clinic) throw new Error('Clinic not found');

    return await this.patientRepo.save({
      name: input.name,
      surname: input.surname,
      phone: input.phone,
      password: input.password,
      birthDate: new Date(), // Default to today
      clinic,
    } as Partial<Patient>);
  }

  async updatePatientPassword(
    patientId: number,
    clinicId: number,
    hashedPassword: string,
  ): Promise<Patient | null> {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId, clinic: { id: clinicId } },
    });
    if (!patient) return null;
    patient.password = hashedPassword;
    return await this.patientRepo.save(patient);
  }

  async findPatientsByPhoneAndClinic(
    phone: string,
    clinicId: number,
  ): Promise<Patient[]> {
    return await this.patientRepo.find({
      where: { phone, clinic: { id: clinicId } },
      relations: ['clinic'],
    });
  }

  async findPatientByIdentity(
    name: string,
    surname: string,
    birthDate: Date | string,
    clinicId: number,
  ): Promise<Patient | null> {
    return await this.patientRepo.findOne({
      where: {
        name,
        surname,
        birthDate: birthDate instanceof Date ? birthDate : new Date(birthDate),
        clinic: { id: clinicId },
      },
      relations: ['clinic'],
    });
  }
}
