import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ToothTreatmentTeeth } from './entities/tooth_treatment_teeth.entity';
import { ToothTreatment } from '../tooth_treatment/entities/tooth_treatment.entity';
import { PatientTooth } from '../patient_tooth/entities/patient_tooth.entity';

@Injectable()
export class ToothTreatmentTeethRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo(): Repository<ToothTreatmentTeeth> {
    return this.dataSource.getRepository(ToothTreatmentTeeth);
  }

  async addTeethToTreatment(
    dentistId: number,
    input: { toothTreatmentId: number; patientId: number; toothIds: number[] },
  ): Promise<ToothTreatmentTeeth[]> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);
    const ptRepo = this.dataSource.getRepository(PatientTooth);

    const toothTreatment = await ttRepo.findOne({
      where: { id: input.toothTreatmentId },
      relations: ['appointment', 'appointment.dentist'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    if (toothTreatment.appointment?.dentist?.id !== dentistId)
      throw new Error('Forbidden');

    const patientTeeth: PatientTooth[] = [];
    for (const toothId of input.toothIds) {
      const pt = await ptRepo.findOne({
        where: { patient: input.patientId, tooth: toothId },
      });
      if (!pt) throw new Error(`PatientTooth not found for tooth ${toothId}`);
      patientTeeth.push(pt);
    }

    const records = patientTeeth.map((pt) =>
      this.repo.create({
        toothTreatment,
        patientTooth: pt,
      }),
    );
    return await this.repo.save(records);
  }

  async removeTeethFromTreatment(
    dentistId: number,
    input: { toothTreatmentId: number; toothIds: number[] },
  ): Promise<void> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);

    const toothTreatment = await ttRepo.findOne({
      where: { id: input.toothTreatmentId },
      relations: ['appointment', 'appointment.dentist'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    if (toothTreatment.appointment?.dentist?.id !== dentistId)
      throw new Error('Forbidden');

    const queryBuilder = this.repo
      .createQueryBuilder()
      .delete()
      .where('tooth_treatment_id = :toothTreatmentId', {
        toothTreatmentId: input.toothTreatmentId,
      })
      .andWhere('tooth_id IN (:...toothIds)', { toothIds: input.toothIds });

    await queryBuilder.execute();
  }

  async updateTeethForTreatment(
    dentistId: number,
    input: { toothTreatmentId: number; patientId: number; toothIds: number[] },
  ): Promise<ToothTreatmentTeeth[]> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);

    const toothTreatment = await ttRepo.findOne({
      where: { id: input.toothTreatmentId },
      relations: ['appointment', 'appointment.dentist'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    if (toothTreatment.appointment?.dentist?.id !== dentistId)
      throw new Error('Forbidden');

    await this.repo.delete({ toothTreatment: { id: input.toothTreatmentId } });
    return await this.addTeethToTreatment(dentistId, input);
  }

  async getTeethForTreatment(
    dentistId: number,
    toothTreatmentId: number,
  ): Promise<ToothTreatmentTeeth[]> {
    const ttRepo = this.dataSource.getRepository(ToothTreatment);

    const toothTreatment = await ttRepo.findOne({
      where: { id: toothTreatmentId },
      relations: ['appointment', 'appointment.dentist'],
    });
    if (!toothTreatment) throw new Error('ToothTreatment not found');
    if (toothTreatment.appointment?.dentist?.id !== dentistId)
      throw new Error('Forbidden');

    return await this.repo.find({
      where: { toothTreatment: { id: toothTreatmentId } },
      relations: ['patientTooth'],
    });
  }

  async findAll(
    dentistId: number,
    filters: {
      id?: number;
      toothTreatmentId?: number;
      toothId?: number;
      patientId?: number;
    },
  ): Promise<ToothTreatmentTeeth[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('ttt')
      .leftJoinAndSelect('ttt.toothTreatment', 'tt')
      .leftJoinAndSelect('tt.appointment', 'appointment')
      .leftJoinAndSelect('appointment.dentist', 'dentist')
      .leftJoinAndSelect('ttt.patientTooth', 'patientTooth')
      .where('dentist.id = :dentistId', { dentistId });

    if (filters.id !== undefined) {
      queryBuilder.andWhere('ttt.id = :id', { id: filters.id });
    }
    if (filters.toothTreatmentId !== undefined) {
      queryBuilder.andWhere('ttt.toothTreatment = :toothTreatmentId', {
        toothTreatmentId: filters.toothTreatmentId,
      });
    }
    if (filters.toothId !== undefined) {
      queryBuilder.andWhere('patientTooth.tooth = :toothId', {
        toothId: filters.toothId,
      });
    }
    if (filters.patientId !== undefined) {
      queryBuilder.andWhere('patientTooth.patient = :patientId', {
        patientId: filters.patientId,
      });
    }

    return await queryBuilder.getMany();
  }
}
