import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, In, Brackets } from 'typeorm';
import { ToothTreatment } from './entities/tooth_treatment.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Treatment } from '../treatment/entities/treatment.entity';
import { Dentist } from '../dentist/entities/dentist.entity';
import { PatientTooth } from '../patient_tooth/entities/patient_tooth.entity';
import { ToothTreatmentTeeth } from '../tooth_treatment_teeth/entities/tooth_treatment_teeth.entity';
import {
  calculateAppointmentCalculatedFee,
  calculateAppointmentDiscountFee,
} from '../appointment/appointment-fee.util';
import { calculateToothTreatmentFeeSnapshot } from './tooth-treatment-fee.util';

@Injectable()
export class ToothTreatmentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<ToothTreatment> {
    return this.dataSource.getRepository(ToothTreatment);
  }

  private async getClinicIdForDentist(dentistId: number): Promise<number> {
    const dentist = await this.dataSource
      .getRepository(Dentist)
      .findOne({ where: { id: dentistId }, relations: ['staff'] });
    if (!dentist?.staff) throw new Error('Dentist not found');
    return dentist.staff.clinicId;
  }

  private async getDentistForAppointmentClinic(
    appointmentId: number,
  ): Promise<Dentist> {
    const appointment = await this.dataSource
      .getRepository(Appointment)
      .findOne({
        where: { id: appointmentId },
        relations: ['patient', 'patient.clinic'],
      });
    if (!appointment?.patient?.clinic?.id) {
      throw new Error('Clinic not found for appointment');
    }

    const clinicId = appointment.patient.clinic.id;
    const mappedDentist = await this.dataSource
      .getRepository(Dentist)
      .findOne({ where: { id: clinicId } });
    if (!mappedDentist) {
      throw new Error('Dentist not found for clinic mapping');
    }
    return mappedDentist;
  }

  private async computeFeeSnapshotForTreatment(
    treatment: Treatment,
    patientId: number,
    toothIds: number[],
  ): Promise<number> {
    const ptRepo = this.dataSource.getRepository(PatientTooth);
    let teethJaws: { upper_jaw: boolean }[] = [];
    if (toothIds.length > 0) {
      const pts = await ptRepo.find({
        where: { patient: patientId, tooth: In(toothIds) },
        relations: ['toothEntity'],
      });
      teethJaws = pts.map((pt) => ({ upper_jaw: pt.toothEntity.upper_jaw }));
    }
    return calculateToothTreatmentFeeSnapshot(treatment, {
      toothCount: toothIds.length,
      teethJaws,
    });
  }

  private async refreshAppointmentFees(appointmentId: number): Promise<void> {
    const appointmentRepo = this.dataSource.getRepository(Appointment);
    const appointment = await appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: [
        'toothTreatments',
        'toothTreatments.treatment',
        'toothTreatments.toothTreatmentMedicines',
        'toothTreatments.toothTreatmentMedicines.medicineEntity',
      ],
    });

    if (!appointment) return;

    const oldCalculatedFee = appointment.calculatedFee;
    appointment.calculatedFee = calculateAppointmentCalculatedFee(appointment);
    appointment.discountFee = calculateAppointmentDiscountFee(
      appointment.calculatedFee,
      appointment.chargedFee,
    );

    if (oldCalculatedFee !== appointment.calculatedFee) {
      await appointmentRepo.save(appointment);
    }
  }

  async createForDentist(
    dentistId: number,
    input: {
      appointmentId: number;
      treatmentId: number;
      patientId: number;
      toothIds: number[];
      description: string | null;
    },
  ): Promise<ToothTreatment> {
    const appointmentRepo = this.dataSource.getRepository(Appointment);
    const treatmentRepo = this.dataSource.getRepository(Treatment);
    const ptRepo = this.dataSource.getRepository(PatientTooth);

    const appointment = await appointmentRepo.findOne({
      where: { id: input.appointmentId },
      relations: ['patient'],
    });
    if (!appointment) throw new Error('Appointment not found');
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (appointment.clinicId !== clinicId) throw new Error('Forbidden');
    if (appointment.patient?.id !== input.patientId)
      throw new Error('InvalidPatientForAppointment');
    const treatment = await treatmentRepo.findOne({
      where: { id: input.treatmentId, clinic: { id: clinicId } },
    });
    if (!treatment) throw new Error('Treatment not found or not owned');

    for (const toothId of input.toothIds) {
      const patientTooth = await ptRepo.findOne({
        where: { patient: input.patientId, tooth: toothId },
      });
      if (!patientTooth)
        throw new Error(`PatientTooth not found for tooth ${toothId}`);
    }

    const feeSnapshot = await this.computeFeeSnapshotForTreatment(
      treatment,
      input.patientId,
      input.toothIds,
    );
    const mappedDentist = await this.getDentistForAppointmentClinic(
      input.appointmentId,
    );

    const created = this.repo.create({
      appointment,
      treatment,
      dentist: mappedDentist,
      feeSnapshot,
      patientTooth: null,
      patient: input.patientId,
      tooth: null,
      description: input.description,
    });
    const savedToothTreatment = await this.repo.save(created);

    // Create ToothTreatmentTeeth records for each tooth
    if (input.toothIds.length > 0) {
      const tttRepo = this.dataSource.getRepository(ToothTreatmentTeeth);
      const patientTeeth = await ptRepo.find({
        where: {
          patient: input.patientId,
          tooth: In(input.toothIds),
        },
      });

      const tttRecords = patientTeeth.map((patientTooth) =>
        tttRepo.create({
          toothTreatment: savedToothTreatment,
          patientTooth: patientTooth,
        }),
      );
      await tttRepo.save(tttRecords);
    }

    await this.refreshAppointmentFees(appointment.id);
    return savedToothTreatment;
  }

  async updateEnsureOwnership(
    dentistId: number,
    id: number,
    updates: Partial<{
      treatmentId: number;
      toothIds: number[];
      description: string | null;
    }>,
  ): Promise<ToothTreatment> {
    const current = await this.repo.findOne({
      where: { id },
      relations: ['appointment', 'treatment'],
    });
    if (!current) throw new Error('ToothTreatment not found');
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (current.appointment?.clinicId !== clinicId)
      throw new Error('Forbidden');

    if (updates.treatmentId !== undefined) {
      const treatment = await this.dataSource.getRepository(Treatment).findOne({
        where: { id: updates.treatmentId, clinic: { id: clinicId } },
      });
      if (!treatment) throw new Error('Treatment not found or not owned');
      current.treatment = treatment;
    }
    if (updates.description !== undefined)
      current.description = updates.description;

    current.dentist = await this.getDentistForAppointmentClinic(
      current.appointment.id,
    );

    const tttRepo = this.dataSource.getRepository(ToothTreatmentTeeth);
    const ptRepo = this.dataSource.getRepository(PatientTooth);

    // Handle tooth_ids update
    if (updates.toothIds !== undefined) {
      // Remove existing ToothTreatmentTeeth records
      await tttRepo.delete({ toothTreatment: { id } });

      // Set legacy tooth to null
      current.tooth = null;

      // Create new ToothTreatmentTeeth records
      if (updates.toothIds.length > 0) {
        const patientTeeth = await ptRepo.find({
          where: {
            patient: current.patient,
            tooth: In(updates.toothIds),
          },
        });

        const tttRecords = patientTeeth.map((patientTooth) =>
          tttRepo.create({
            toothTreatment: current,
            patientTooth: patientTooth,
          }),
        );
        await tttRepo.save(tttRecords);
      }
    }

    let toothIdsForFee: number[];
    if (updates.toothIds !== undefined) {
      toothIdsForFee = updates.toothIds;
    } else {
      const links = await tttRepo.find({
        where: { toothTreatment: { id } },
        relations: ['patientTooth'],
      });
      toothIdsForFee = links.map((l) => l.patientTooth.tooth);
      if (toothIdsForFee.length === 0 && current.tooth != null) {
        toothIdsForFee = [current.tooth];
      }
    }

    const treatmentRepo = this.dataSource.getRepository(Treatment);
    const treatmentIdForFee = current.treatment.id;
    const freshTreatment = await treatmentRepo.findOne({
      where: { id: treatmentIdForFee, clinic: { id: clinicId } },
    });
    if (!freshTreatment) throw new Error('Treatment not found or not owned');
    current.treatment = freshTreatment;
    current.feeSnapshot = await this.computeFeeSnapshotForTreatment(
      freshTreatment,
      current.patient,
      toothIdsForFee,
    );

    const updated = await this.repo.save(current);
    await this.refreshAppointmentFees(updated.appointment.id);

    return updated;
  }

  async deleteEnsureOwnership(dentistId: number, id: number): Promise<void> {
    const current = await this.repo.findOne({
      where: { id },
      relations: ['appointment'],
    });
    if (!current) throw new Error('ToothTreatment not found');
    const clinicId = await this.getClinicIdForDentist(dentistId);
    if (current.appointment?.clinicId !== clinicId)
      throw new Error('Forbidden');
    const appointmentId = current.appointment.id;
    await this.repo.remove(current);
    await this.refreshAppointmentFees(appointmentId);
  }

  async findToothTreatmentsForDentist(
    dentistId: number,
    filters: {
      id?: number;
      appointment?: number;
      tooth?: number;
      patient?: number;
      treatment?: number;
      dentist?: number;
    },
  ): Promise<ToothTreatment[]> {
    const clinicId = await this.getClinicIdForDentist(dentistId);
    const queryBuilder = this.repo
      .createQueryBuilder('toothTreatment')
      .leftJoinAndSelect('toothTreatment.appointment', 'appointment')
      .leftJoinAndSelect('toothTreatment.treatment', 'treatment')
      .leftJoinAndSelect('toothTreatment.dentist', 'dentist')
      .leftJoinAndSelect('dentist.staff', 'dentistStaff')
      .leftJoinAndSelect('toothTreatment.patientTooth', 'patientTooth')
      .leftJoinAndSelect(
        'toothTreatment.toothTreatmentTeeth',
        'toothTreatmentTeeth',
      )
      .leftJoinAndSelect('toothTreatmentTeeth.patientTooth', 'tttPatientTooth')
      .leftJoinAndSelect(
        'toothTreatmentTeeth.treatmentRandevues',
        'treatmentRandevues',
      )
      .leftJoinAndSelect('treatmentRandevues.randevue', 'linkedRandevue')
      .leftJoinAndSelect('appointment.patient', 'appointmentPatient')
      .where('appointment.clinicId = :clinicId', { clinicId });

    if (filters.id !== undefined) {
      queryBuilder.andWhere('toothTreatment.id = :id', { id: filters.id });
    }
    if (filters.appointment !== undefined) {
      queryBuilder.andWhere('toothTreatment.appointment = :appointment', {
        appointment: filters.appointment,
      });
    }
    if (filters.tooth !== undefined) {
      // include legacy per-record tooth field and new ToothTreatmentTeeth relation
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('toothTreatment.tooth = :tooth', {
            tooth: filters.tooth,
          }).orWhere('tttPatientTooth.tooth = :tooth', {
            tooth: filters.tooth,
          });
        }),
      );
    }
    if (filters.patient !== undefined) {
      queryBuilder.andWhere('toothTreatment.patient = :patient', {
        patient: filters.patient,
      });
    }
    if (filters.treatment !== undefined) {
      queryBuilder.andWhere('toothTreatment.treatment = :treatment', {
        treatment: filters.treatment,
      });
    }
    if (filters.dentist !== undefined) {
      queryBuilder.andWhere('toothTreatment.dentist = :filterDentist', {
        filterDentist: filters.dentist,
      });
    }

    return await queryBuilder.getMany();
  }
}
