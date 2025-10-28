import { Entity, ManyToOne, JoinColumn, PrimaryColumn, OneToMany } from 'typeorm';
import { Patient } from '../../patient/entities/patient.entity';
import { Tooth } from '../../tooth/entities/tooth.entity';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';

@Entity({ name: 'Patient_Teeth' })
export class PatientTooth {
    @PrimaryColumn({ type: 'int' })
    patient: number;

    @PrimaryColumn({ type: 'int' })
    tooth: number;

    @ManyToOne(() => Patient, (patient) => patient.patientTeeth, { nullable: false })
    @JoinColumn({ name: 'patient' })
    patientEntity: Patient;

    @ManyToOne(() => Tooth, (tooth) => tooth.patientTeeth, { nullable: false })
    @JoinColumn({ name: 'tooth' })
    toothEntity: Tooth;

    @OneToMany(() => ToothTreatment, (tt) => tt.patientTooth)
    toothTreatments: ToothTreatment[];
}


