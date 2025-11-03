import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
    constructor(private readonly patientRepository: PatientRepository) {}

    async create(dentistId: number, dto: CreatePatientDto) {
        try {
            const created = await this.patientRepository.createPatientForDentist(dentistId, {
                name: dto.name,
                surname: dto.surname,
                birthDate: new Date(dto.birthDate),
            });
            return created;
        } catch (e: any) {
            if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
            throw e;
        }
    }

    async patch(dentistId: number, id: number, dto: UpdatePatientDto) {
        try {
            const updated = await this.patientRepository.updatePatientEnsureOwnership(dentistId, id, {
                name: dto.name,
                surname: dto.surname,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            });
            return updated;
        } catch (e: any) {
            if (e?.message?.includes('Patient not found')) throw new NotFoundException('Patient not found');
            if (e?.message?.includes('Forbidden')) throw new BadRequestException("You don't have such a patient");
            if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
            throw e;
        }
    }
}
