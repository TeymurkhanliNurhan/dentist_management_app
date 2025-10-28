import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, JoinColumns } from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Treatment } from '../../treatment/entities/treatment.entity';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';

@Entity({ name: 'Tooth_Treatment' })
export class ToothTreatment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    patient: number;

    @Column({ type: 'int' })
    tooth: number;

    @ManyToOne(() => Appointment, (appointment) => appointment.toothTreatments, { nullable: false })
    @JoinColumn({ name: 'appointment' })
    appointment: Appointment;

    @ManyToOne(() => Treatment, (treatment) => treatment.toothTreatments, { nullable: false })
    @JoinColumn({ name: 'treatment' })
    treatment: Treatment;

    @ManyToOne(() => PatientTooth, (pt) => pt.toothTreatments, { nullable: false })
    @JoinColumns([
        { name: 'patient', referencedColumnName: 'patient' },
        { name: 'tooth', referencedColumnName: 'tooth' },
    ])
    patientTooth: PatientTooth;

    @Column({ type: 'varchar', length: 300, nullable: true })
    description: string | null;
}


