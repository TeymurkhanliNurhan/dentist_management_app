import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';
import { Dentist } from '../../dentist/entities/dentist.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';

@Entity({ name: 'Appointment' })
export class Appointment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date | null;

    @Column({ type: 'double precision', nullable: false, default: 0 })
    calculatedFee: number;

    @Column({ type: 'double precision', nullable: true })
    chargedFee: number | null;

    @Column({ type: 'double precision', nullable: true })
    discountFee: number | null;

    @OneToMany(() => ToothTreatment, (tt) => tt.appointment)
    toothTreatments: ToothTreatment[];

    @OneToMany(() => Randevue, (r) => r.appointment)
    randevues: Randevue[];

    @ManyToOne(() => Dentist, (dentist) => dentist.appointments, { nullable: false })
    @JoinColumn({ name: 'dentist' })
    dentist: Dentist;

    @ManyToOne(() => Patient, (patient) => patient.appointments, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'patient' })
    patient: Patient;
}
