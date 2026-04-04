import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Treatment } from '../../treatment/entities/treatment.entity';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';
import { ToothTreatmentMedicine } from '../../tooth_treatment_medicine/entities/tooth_treatment_medicine.entity';
import { ToothTreatmentTeeth } from '../../tooth_treatment_teeth/entities/tooth_treatment_teeth.entity';
import { Media } from '../../media/entities/media.entity';

@Entity({ name: 'Tooth_Treatment' })
export class ToothTreatment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    patient: number;

    @Column({ type: 'int', nullable: true })
    tooth: number | null;

    @ManyToOne(() => Appointment, (appointment) => appointment.toothTreatments, { nullable: false })
    @JoinColumn({ name: 'appointment' })
    appointment: Appointment;

    @ManyToOne(() => Treatment, (treatment) => treatment.toothTreatments, { nullable: false })
    @JoinColumn({ name: 'treatment' })
    treatment: Treatment;

    @Column({ type: 'double precision', nullable: false, default: 0 })
    feeSnapshot: number;

    @ManyToOne(() => PatientTooth, (pt) => pt.toothTreatments, { nullable: true })
    @JoinColumn([
        { name: 'patient', referencedColumnName: 'patient' },
        { name: 'tooth', referencedColumnName: 'tooth' },
    ])
    patientTooth: PatientTooth | null;

    @Column({ type: 'varchar', length: 300, nullable: true })
    description: string | null;

    @OneToMany(() => ToothTreatmentMedicine, (ttm) => ttm.toothTreatmentEntity)
    toothTreatmentMedicines: ToothTreatmentMedicine[];

    @OneToMany(() => ToothTreatmentTeeth, (ttt) => ttt.toothTreatment)
    toothTreatmentTeeth: ToothTreatmentTeeth[];

    @OneToMany(() => Media, (media) => media.toothTreatment)
    medias: Media[];
}
