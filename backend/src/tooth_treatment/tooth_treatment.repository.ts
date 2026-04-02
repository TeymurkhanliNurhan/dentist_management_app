import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, In, Brackets } from 'typeorm';
import { ToothTreatment } from './entities/tooth_treatment.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Treatment } from '../treatment/entities/treatment.entity';
import { PatientTooth } from '../patient_tooth/entities/patient_tooth.entity';
import { ToothTreatmentTeeth } from '../tooth_treatment_teeth/entities/tooth_treatment_teeth.entity';

@Injectable()
export class ToothTreatmentRepository {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

    private get repo(): Repository<ToothTreatment> {
        return this.dataSource.getRepository(ToothTreatment);
    }

    async createForDentist(
        dentistId: number,
        input: { appointmentId: number; treatmentId: number; patientId: number; toothIds: number[]; description: string | null },
    ): Promise<ToothTreatment> {
        const appointmentRepo = this.dataSource.getRepository(Appointment);
        const treatmentRepo = this.dataSource.getRepository(Treatment);
        const ptRepo = this.dataSource.getRepository(PatientTooth);

        const appointment = await appointmentRepo.findOne({ where: { id: input.appointmentId }, relations: ['dentist', 'patient'] });
        if (!appointment) throw new Error('Appointment not found');
        if (appointment.dentist?.id !== dentistId) throw new Error('Forbidden');
        if (appointment.patient?.id !== input.patientId) throw new Error('InvalidPatientForAppointment');

        const treatment = await treatmentRepo.findOne({ where: { id: input.treatmentId, dentist: { id: dentistId } } });
        if (!treatment) throw new Error('Treatment not found or not owned');

        for (const toothId of input.toothIds) {
            const patientTooth = await ptRepo.findOne({ where: { patient: input.patientId, tooth: toothId } });
            if (!patientTooth) throw new Error(`PatientTooth not found for tooth ${toothId}`);
        }

        const created = this.repo.create({
            appointment,
            treatment,
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
                    tooth: In(input.toothIds) 
                } 
            });
            
            const tttRecords = patientTeeth.map(patientTooth => 
                tttRepo.create({
                    toothTreatment: savedToothTreatment,
                    patientTooth: patientTooth,
                })
            );
            await tttRepo.save(tttRecords);
        }

        return savedToothTreatment;
    }

    async updateEnsureOwnership(
        dentistId: number,
        id: number,
        updates: Partial<{ treatmentId: number; toothIds: number[]; description: string | null }>,
    ): Promise<ToothTreatment> {
        const current = await this.repo.findOne({ where: { id }, relations: ['appointment', 'appointment.dentist'] });
        if (!current) throw new Error('ToothTreatment not found');
        if (current.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');

        if (updates.treatmentId !== undefined) {
            const treatment = await this.dataSource.getRepository(Treatment).findOne({ where: { id: updates.treatmentId, dentist: { id: dentistId } } });
            if (!treatment) throw new Error('Treatment not found or not owned');
            current.treatment = treatment;
        }
        if (updates.description !== undefined) current.description = updates.description;
        
        // Handle tooth_ids update
        if (updates.toothIds !== undefined) {
            const tttRepo = this.dataSource.getRepository(ToothTreatmentTeeth);
            const ptRepo = this.dataSource.getRepository(PatientTooth);

            // Remove existing ToothTreatmentTeeth records
            await tttRepo.delete({ toothTreatment: { id } });

            // Set legacy tooth to null
            current.tooth = null;

            // Create new ToothTreatmentTeeth records
            if (updates.toothIds.length > 0) {
                const patientTeeth = await ptRepo.find({ 
                    where: { 
                        patient: current.patient, 
                        tooth: In(updates.toothIds) 
                    } 
                });
                
                const tttRecords = patientTeeth.map(patientTooth => 
                    tttRepo.create({
                        toothTreatment: current,
                        patientTooth: patientTooth,
                    })
                );
                await tttRepo.save(tttRecords);
            }
        }

        const updated = await this.repo.save(current);

        return updated;
    }

    async deleteEnsureOwnership(dentistId: number, id: number): Promise<void> {
        const current = await this.repo.findOne({ where: { id }, relations: ['appointment', 'appointment.dentist'] });
        if (!current) throw new Error('ToothTreatment not found');
        if (current.appointment?.dentist?.id !== dentistId) throw new Error('Forbidden');
        await this.repo.remove(current);
    }

    async findToothTreatmentsForDentist(
        dentistId: number,
        filters: { id?: number; appointment?: number; tooth?: number; patient?: number; treatment?: number },
    ): Promise<ToothTreatment[]> {
        const queryBuilder = this.repo
            .createQueryBuilder('toothTreatment')
            .leftJoinAndSelect('toothTreatment.appointment', 'appointment')
            .leftJoinAndSelect('toothTreatment.treatment', 'treatment')
            .leftJoinAndSelect('toothTreatment.patientTooth', 'patientTooth')
            .leftJoinAndSelect('toothTreatment.toothTreatmentTeeth', 'toothTreatmentTeeth')
            .leftJoinAndSelect('toothTreatmentTeeth.patientTooth', 'tttPatientTooth')
            .leftJoinAndSelect('appointment.patient', 'appointmentPatient')
            .where('appointment.dentist = :dentistId', { dentistId });

        if (filters.id !== undefined) {
            queryBuilder.andWhere('toothTreatment.id = :id', { id: filters.id });
        }
        if (filters.appointment !== undefined) {
            queryBuilder.andWhere('toothTreatment.appointment = :appointment', { appointment: filters.appointment });
        }
        if (filters.tooth !== undefined) {
            // include legacy per-record tooth field and new ToothTreatmentTeeth relation
            queryBuilder.andWhere(new Brackets((qb) => {
                qb.where('toothTreatment.tooth = :tooth', { tooth: filters.tooth })
                  .orWhere('tttPatientTooth.tooth = :tooth', { tooth: filters.tooth });
            }));
        }
        if (filters.patient !== undefined) {
            queryBuilder.andWhere('toothTreatment.patient = :patient', { patient: filters.patient });
        }
        if (filters.treatment !== undefined) {
            queryBuilder.andWhere('toothTreatment.treatment = :treatment', { treatment: filters.treatment });
        }

        return await queryBuilder.getMany();
    }
}



