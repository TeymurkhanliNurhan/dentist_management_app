import { Injectable, Logger } from '@nestjs/common';
import { PatientToothRepository } from './patient_tooth.repository';
import { GetPatientToothDto } from './dto/get-patient_tooth.dto';
import { LogWriter } from '../log-writer';

@Injectable()
export class PatientToothService {
    private readonly logger = new Logger(PatientToothService.name);

    constructor(private readonly patientToothRepository: PatientToothRepository) {}

    async findAll(dto: GetPatientToothDto) {
        try {
            const patientTeeth = await this.patientToothRepository.findPatientTeeth({
                patient: dto.patient,
                tooth: dto.tooth,
            });
            const msg = `Retrieved ${patientTeeth.length} patient tooth/teeth for patient ${dto.patient}${dto.tooth ? ` and tooth ${dto.tooth}` : ''}`;
            this.logger.log(msg);
            LogWriter.append('log', PatientToothService.name, msg);
            return patientTeeth.map(pt => ({
                patient: pt.patient,
                tooth: pt.tooth,
                toothNumber: pt.toothEntity?.number,
                permanent: pt.toothEntity?.permanent ? 'permanent' : 'childish',
            }));
        } catch (e: any) {
            throw e;
        }
    }
}
