import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class PatientRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get patientRepo(): Repository<Patient> {
        return this.dataSource.getRepository(Patient);
    }

    async getNextPatientId(): Promise<number> {
        const result = await this.patientRepo
            .createQueryBuilder('p')
            .select('MAX(p.id)', 'max')
            .getRawOne<{ max: number | null }>();
        const max = result?.max ?? 0;
        return Number(max) + 1;
    }

    async createPatientForDentist(dentistId: number, input: { name: string; surname: string; birthDate: Date }): Promise<Patient> {
        const dentistRef = await this.dataSource.getRepository(Dentist).findOne({ where: { id: dentistId } });
        if (!dentistRef) throw new Error('Dentist not found');
        const nextId = await this.getNextPatientId();
        const patient = this.patientRepo.create({
            id: nextId,
            name: input.name,
            surname: input.surname,
            birthDate: input.birthDate,
            dentist: dentistRef,
        });
        return await this.patientRepo.save(patient);
    }

    async updatePatientEnsureOwnership(dentistId: number, id: number, updates: Partial<{ name: string; surname: string; birthDate: Date }>): Promise<Patient> {
        const patient = await this.patientRepo.findOne({ where: { id, dentist: { id: dentistId } } });
        if (!patient) throw new Error('Forbidden');
        if (updates.name !== undefined) patient.name = updates.name;
        if (updates.surname !== undefined) patient.surname = updates.surname;
        if (updates.birthDate !== undefined) patient.birthDate = updates.birthDate;
        return await this.patientRepo.save(patient);
    }
}


