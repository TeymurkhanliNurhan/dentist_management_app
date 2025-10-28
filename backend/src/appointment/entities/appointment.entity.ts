import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';

@Entity({ name: 'Appointment' })
export class Appointment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date' })
    endDate: Date;

    @Column({ type: 'int', nullable: true })
    discountFee: number | null;

    @OneToMany(() => ToothTreatment, (tt) => tt.appointment)
    toothTreatments: ToothTreatment[];
}


