import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn} from 'typeorm';
import { Clinic } from '../../clinic/entities/clinic.entity';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';

@Entity({ name: 'Patient' })
export class Patient {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 20 })
    name: string;

    @Column({ type: 'varchar', length: 25 })
    surname: string;

    @Column({ type: 'date' })
    birthDate: Date;

    @ManyToOne(() => Clinic, (clinic) => clinic.patients, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'clinicId' })
    clinic: Clinic;

    @OneToMany(() => PatientTooth, (pt) => pt.patient)
    patientTeeth: PatientTooth[];

    @OneToMany(() => Appointment, (a) => a.patient)
    appointments: Appointment[];

    @OneToMany(() => Randevue, (r) => r.patient)
    randevues: Randevue[];
}


