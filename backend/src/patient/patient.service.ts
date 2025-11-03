import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientCreateResponseDto } from './dto/patient-create-response.dto';
import { PatientUpdateResponseDto } from './dto/patient-update-response.dto';
import { LogWriter } from '../logs/log-writer';

@Injectable()
export class PatientService {
    constructor(private readonly patientRepository: PatientRepository) {}
    private readonly logger = new Logger(PatientService.name);

    async create(dentistId: number, dto: CreatePatientDto): Promise<PatientCreateResponseDto> {
        try {
            const created = await this.patientRepository.createPatientForDentist(dentistId, {
                name: dto.name,
                surname: dto.surname,
                birthDate: new Date(dto.birthDate),
            });
            const msg = `Dentist with id ${dentistId} created Patient with id ${created.id}`;
            this.logger.log(msg);
            LogWriter.append('log', PatientService.name, msg);
            return {
                id: created.id,
                name: created.name,
                surname: created.surname,
                birthDate: created.birthDate.toISOString().slice(0, 10),
                dentist: { id: dentistId },
            };
        } catch (e: any) {
            if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
            throw e;
        }
    }

    async patch(dentistId: number, id: number, dto: UpdatePatientDto): Promise<PatientUpdateResponseDto> {
        try {
            const updated = await this.patientRepository.updatePatientEnsureOwnership(dentistId, id, {
                name: dto.name,
                surname: dto.surname,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            });
            const msg = `Dentist with id ${dentistId} updated Patient with id ${updated.id}`;
            this.logger.log(msg);
            LogWriter.append('log', PatientService.name, msg);
            return {
                id: updated.id,
                name: updated.name,
                surname: updated.surname,
                birthDate: updated.birthDate.toISOString().slice(0, 10),
            };
        } catch (e: any) {
            if (e?.message?.includes('Patient not found')) throw new NotFoundException('Patient not found');
            if (e?.message?.includes('Forbidden')) throw new BadRequestException("You don't have such a patient");
            if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
            throw e;
        }
    }
}
