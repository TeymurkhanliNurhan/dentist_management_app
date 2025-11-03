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

    async createPatient(input: { name: string; surname: string; birthDate: Date; dentist: number }): Promise<Patient> {
        const dentistRef = await this.dataSource.getRepository(Dentist).findOne({ where: { id: input.dentist } });
        if (!dentistRef) throw new Error('Dentist not found');
        const patient = this.patientRepo.create({
            name: input.name,
            surname: input.surname,
            birthDate: input.birthDate,
            dentist: dentistRef,
        });
        return await this.patientRepo.save(patient);
    }

    async updatePatient(id: number, updates: Partial<{ name: string; surname: string; birthDate: Date; dentist: number }>): Promise<Patient> {
        const patient = await this.patientRepo.findOne({ where: { id } });
        if (!patient) throw new Error('Patient not found');
        if (updates.name !== undefined) patient.name = updates.name;
        if (updates.surname !== undefined) patient.surname = updates.surname;
        if (updates.birthDate !== undefined) patient.birthDate = updates.birthDate;
        if (updates.dentist !== undefined) {
            const dentistRef = await this.dataSource.getRepository(Dentist).findOne({ where: { id: updates.dentist } });
            if (!dentistRef) throw new Error('Dentist not found');
            patient.dentist = dentistRef;
        }
        return await this.patientRepo.save(patient);
    }
}


