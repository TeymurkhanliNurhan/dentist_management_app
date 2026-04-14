import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';
import { DentistTreatment } from '../../dentist_treatment/entities/dentist_treatment.entity';
import { Room } from '../../room/entities/room.entity';

@Entity({ name: 'Dentist' })
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

  @OneToMany(() => DentistTreatment, (dt) => dt.dentistEntity)
  dentistTreatments: DentistTreatment[];

  @OneToMany(() => Room, (room) => room.dentist)
  rooms: Room[];
}
