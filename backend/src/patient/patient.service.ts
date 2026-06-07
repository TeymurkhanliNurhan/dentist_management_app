import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientDto } from './dto/get-patient.dto';
import { PatientCreateResponseDto } from './dto/patient-create-response.dto';
import { PatientUpdateResponseDto } from './dto/patient-update-response.dto';
import { LogWriter } from '../log-writer';
import { Patient } from './entities/patient.entity';
import { PatientAuthContext } from '../auth/patient-access';

@Injectable()
export class PatientService {
  constructor(private readonly patientRepository: PatientRepository) {}
  private readonly logger = new Logger(PatientService.name);

  private toPatientResponse(patient: Patient): PatientUpdateResponseDto {
    const birthDate =
      patient.birthDate instanceof Date
        ? patient.birthDate
        : new Date(patient.birthDate);
    return {
      id: patient.id,
      name: patient.name,
      surname: patient.surname,
      birthDate: birthDate.toISOString().slice(0, 10),
      number: patient.phone ?? null,
    };
  }

  async create(
    dentistId: number,
    dto: CreatePatientDto,
  ): Promise<PatientCreateResponseDto> {
    try {
      // hash password if provided
      let hashedPassword: string | undefined = undefined;
      if ((dto as any).password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash((dto as any).password, saltRounds);
      }

      const { patient: created, clinicId } =
        await this.patientRepository.createPatientForDentist(dentistId, {
          name: dto.name,
          surname: dto.surname,
          birthDate: new Date(dto.birthDate),
          phone: (dto as any).phone,
          password: hashedPassword,
        });
      const msg = `Dentist with id ${dentistId} created Patient with id ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', PatientService.name, msg);
      return {
        id: created.id,
        name: created.name,
        surname: created.surname,
        birthDate: created.birthDate.toISOString().slice(0, 10),
        clinic: { id: clinicId },
      };
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new ConflictException(
          'A patient with this name, surname, and birth date already exists in this clinic.',
        );
      }
      if (e?.message?.includes('Dentist not found'))
        throw new BadRequestException('Dentist not found');
      throw e;
    }
  }

  async patch(
    dentistId: number,
    id: number,
    dto: UpdatePatientDto,
  ): Promise<PatientUpdateResponseDto> {
    try {
      // If password provided, hash it before updating
      let hashedPassword: string | undefined = undefined;
      if ((dto as any).password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash((dto as any).password, saltRounds);
      }

      const updated = await this.patientRepository.updatePatientEnsureOwnership(
        dentistId,
        id,
        {
          name: dto.name,
          surname: dto.surname,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          phone: dto.phone,
          password: hashedPassword,
        },
      );
      const msg = `Dentist with id ${dentistId} updated Patient with id ${updated.id}`;
      this.logger.log(msg);
      LogWriter.append('log', PatientService.name, msg);
      return this.toPatientResponse(updated);
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new ConflictException(
          'A patient with this name, surname, and birth date already exists in this clinic.',
        );
      }
      if (e?.message?.includes('Patient not found'))
        throw new NotFoundException('Patient not found');
      if (e?.message?.includes('Forbidden'))
        throw new BadRequestException("You don't have such a patient");
      if (e?.message?.includes('Dentist not found'))
        throw new BadRequestException('Dentist not found');
      throw e;
    }
  }

  async findAll(
    dentistId: number,
    dto: GetPatientDto,
  ): Promise<PatientUpdateResponseDto[]> {
    try {
      const patients = await this.patientRepository.findPatientsForDentist(
        dentistId,
        {
          id: dto.id,
          name: dto.name,
          surname: dto.surname,
          birthdate: dto.birthdate,
          number: dto.number,
        },
      );
      const msg = `Dentist with id ${dentistId} retrieved ${patients.length} patient(s)`;
      this.logger.log(msg);
      LogWriter.append('log', PatientService.name, msg);
      return patients.map((patient) => this.toPatientResponse(patient));
    } catch (e: any) {
      throw e;
    }
  }

  async findAllForPatient(
    context: PatientAuthContext,
    dto: GetPatientDto,
  ): Promise<PatientUpdateResponseDto[]> {
    const patients = await this.patientRepository.findPatientsForPatient(
      context.patientId,
      context.clinicId,
      {
        id: dto.id ?? context.patientId,
        name: dto.name,
        surname: dto.surname,
        birthdate: dto.birthdate,
        number: dto.number,
      },
    );
    const msg = `Patient with id ${context.patientId} retrieved ${patients.length} patient record(s)`;
    this.logger.log(msg);
    LogWriter.append('log', PatientService.name, msg);
    return patients.map((patient) => this.toPatientResponse(patient));
  }

  async delete(dentistId: number, id: number): Promise<{ message: string }> {
    try {
      await this.patientRepository.deletePatientEnsureOwnership(dentistId, id);
      const msg = `Dentist with id ${dentistId} deleted Patient with id ${id}`;
      this.logger.log(msg);
      LogWriter.append('log', PatientService.name, msg);
      return { message: 'Patient deleted' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden'))
        throw new NotFoundException('Patient not found');
      throw e;
    }
  }
}
