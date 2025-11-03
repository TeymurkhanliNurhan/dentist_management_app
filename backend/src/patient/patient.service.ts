import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
    constructor(private readonly patientRepository: PatientRepository) {}

    async create(dto: CreatePatientDto) {
        try {
            const created = await this.patientRepository.createPatient({
                name: dto.name,
                surname: dto.surname,
                birthDate: new Date(dto.birthDate),
                dentist: dto.dentist,
            });
            return created;
        } catch (e: any) {
            if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
            throw e;
        }
    }

    async patch(id: number, dto: UpdatePatientDto) {
        try {
            const updated = await this.patientRepository.updatePatient(id, {
                name: dto.name,
                surname: dto.surname,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
                dentist: dto.dentist,
            });
            return updated;
        } catch (e: any) {
            if (e?.message?.includes('Patient not found')) throw new NotFoundException('Patient not found');
            if (e?.message?.includes('Dentist not found')) throw new BadRequestException('Dentist not found');
            throw e;
        }
    }
}
