import { Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, Column } from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';

@Entity({name: 'Dentist'})
export class Dentist {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', unique: true })
    staffId: number;

    @OneToOne(() => Staff, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'staffId' })
    staff: Staff;

    @OneToMany(() => Appointment, (appointment) => appointment.dentist)
    appointments: Appointment[];

    @OneToMany(() => Randevue, (randevue) => randevue.dentist)
    randevues: Randevue[];
}