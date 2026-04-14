import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { Room } from '../../room/entities/room.entity';
import { Nurse } from '../../nurse/entities/nurse.entity';
import { Dentist } from '../../dentist/entities/dentist.entity';

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

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @ManyToOne(() => Patient, (patient) => patient.randevues, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'patient' })
    patient: Patient;

    @ManyToOne(() => Appointment, (appointment) => appointment.randevues, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'appointment' })
    appointment: Appointment | null;

    @ManyToOne(() => Room, (room) => room.randevues, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'room' })
    room: Room;

    @ManyToOne(() => Nurse, (nurse) => nurse.randevues, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'nurse' })
    nurse: Nurse | null;

    @ManyToOne(() => Dentist, (dentist) => dentist.randevues, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'dentist' })
    dentist: Dentist | null;
}
