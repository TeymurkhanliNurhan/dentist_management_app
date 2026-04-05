import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Patient } from '../../patient/entities/patient.entity';

@Entity({ name: 'Randevue' })
export class Randevue {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp' })
    date: Date;

    @Column({ type: 'timestamp' })
    endTime: Date;

    @Column({ type: 'varchar', length: 20 })
    status: string;

    @Column({ type: 'text' })
    note: string;

    @ManyToOne(() => Patient, (patient) => patient.randevues, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'patient' })
    patient: Patient;

    @ManyToOne(() => Appointment, (appointment) => appointment.randevues, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'appointment' })
    appointment: Appointment | null;
}
