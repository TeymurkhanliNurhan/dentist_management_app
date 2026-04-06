import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';

@Entity({ name: 'ToothTreatmentTeeth' })
export class ToothTreatmentTeeth {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ToothTreatment, (tt) => tt.toothTreatmentTeeth, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tooth_treatment_id' })
    toothTreatment: ToothTreatment;

    @ManyToOne(() => PatientTooth, (pt) => pt.toothTreatmentTeeth, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn([
        { name: 'patient_id', referencedColumnName: 'patient' },
        { name: 'tooth_id', referencedColumnName: 'tooth' },
    ])
    patientTooth: PatientTooth;
}
