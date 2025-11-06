import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PatientTooth } from './entities/patient_tooth.entity';
import { Patient } from '../patient/entities/patient.entity';

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
        const patient = await this.patientRepo.findOne({
            where: { id: filters.patient, dentist: { id: dentistId } },
            relations: ['dentist'],
        });

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


