import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';
import { Clinic } from '../../clinic/entities/clinic.entity';

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

  @Column({ type: 'int' })
  clinicId: number;

  @ManyToOne(() => Clinic, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient' })
  patient: Patient;
}
