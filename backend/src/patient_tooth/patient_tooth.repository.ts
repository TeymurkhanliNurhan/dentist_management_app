import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PatientTooth } from './entities/patient_tooth.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class PatientToothRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get patientToothRepo(): Repository<PatientTooth> {
        return this.dataSource.getRepository(PatientTooth);
    }

    private get patientRepo(): Repository<Patient> {
        return this.dataSource.getRepository(Patient);
    }

    async findPatientTeethForDentist(
        dentistId: number,
        filters: { patient: number; tooth?: number },
    ): Promise<PatientTooth[]> {
        const patient = await this.patientRepo
            .createQueryBuilder('p')
            .innerJoin('p.clinic', 'pc')
            .innerJoin(Dentist, 'd', 'd.id = :dentistId', { dentistId })
            .innerJoin('d.staff', 'ds')
            .where('p.id = :patientId', { patientId: filters.patient })
            .andWhere('pc.id = ds.clinicId')
            .getOne();

        if (!patient) {
            throw new Error('Patient not found or Forbidden');
        }

        const queryBuilder = this.patientToothRepo
            .createQueryBuilder('patientTooth')
            .leftJoinAndSelect('patientTooth.toothEntity', 'tooth')
            .where('patientTooth.patient = :patient', { patient: filters.patient });

        if (filters.tooth !== undefined) {
            queryBuilder.andWhere('patientTooth.tooth = :tooth', { tooth: filters.tooth });
        }

        return await queryBuilder.getMany();
    }
}


