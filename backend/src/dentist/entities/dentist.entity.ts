import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';
import { DentistTreatment } from '../../dentist_treatment/entities/dentist_treatment.entity';

@Entity({ name: 'Dentist' })
export class Dentist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  staffId: number;

  @OneToOne(() => Staff, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;

  @OneToMany(() => Randevue, (randevue) => randevue.dentist)
  randevues: Randevue[];

  @OneToMany(() => DentistTreatment, (dt) => dt.dentistEntity)
  dentistTreatments: DentistTreatment[];
}
