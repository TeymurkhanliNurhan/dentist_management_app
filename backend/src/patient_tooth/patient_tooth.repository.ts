import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PatientTooth } from './entities/patient_tooth.entity';

@Injectable()
export class PatientToothRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get patientToothRepo(): Repository<PatientTooth> {
        return this.dataSource.getRepository(PatientTooth);
    }

    async findPatientTeeth(
        filters: { patient: number; tooth?: number },
    ): Promise<PatientTooth[]> {
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


