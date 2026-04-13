import { Entity, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, Column } from 'typeorm';
import { Patient } from '../../patient/entities/patient.entity';
import { Medicine } from '../../medicine/entities/medicine.entity';
import { Treatment } from '../../treatment/entities/treatment.entity';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Entity({name: 'Dentist'})
export class Dentist {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', unique: true })
    staffId: number;

    @OneToOne(() => Staff, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'staffId' })
    staff: Staff;

    @OneToMany(()=> Patient, (patient)=> patient.dentist)
    patients: Patient[];

    @OneToMany(() => Medicine, (medicine) => medicine.dentist)
    medicines: Medicine[];

    @OneToMany(() => Treatment, (treatment) => treatment.dentist)
    treatments: Treatment[];

    @OneToMany(() => Appointment, (appointment) => appointment.dentist)
    appointments: Appointment[];
}