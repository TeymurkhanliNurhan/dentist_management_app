import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn} from 'typeorm';
import { Dentist } from '../../dentist/entities/dentist.entity';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';
import { Appointment } from '../../appointment/entities/appointment.entity';

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

    @ManyToOne(() => Dentist, (dentist) => dentist.patients, { nullable: false })
    @JoinColumn({ name: 'dentist' })
    dentist: Dentist;

    @OneToMany(() => PatientTooth, (pt) => pt.patient)
    patientTeeth: PatientTooth[];

    @OneToMany(() => Appointment, (a) => a.patient)
    appointments: Appointment[];
}


