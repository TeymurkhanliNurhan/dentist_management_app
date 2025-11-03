import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';
import { Dentist } from '../../dentist/entities/dentist.entity';

@Entity({ name: 'Appointment' })
export class Appointment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date | null;

    @Column({ type: 'int', nullable: true })
    discountFee: number | null;

    @OneToMany(() => ToothTreatment, (tt) => tt.appointment)
    toothTreatments: ToothTreatment[];

    @ManyToOne(() => Dentist, (dentist) => dentist.appointments, { nullable: false })
    @JoinColumn({ name: 'dentist' })
    dentist: Dentist;
}


