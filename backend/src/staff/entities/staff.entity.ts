import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Clinic } from '../../clinic/entities/clinic.entity';
import { Dentist } from '../../dentist/entities/dentist.entity';
import { Nurse } from '../../nurse/entities/nurse.entity';
import { FrontDeskWorker } from '../../front_desk_worker/entities/front_desk_worker.entity';
import { Director } from '../../director/entities/director.entity';

@Entity({ name: 'Staff' })
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 31 })
  name: string;

  @Column({ type: 'varchar', length: 31 })
  surname: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @Column({ type: 'varchar', length: 63 })
  gmail: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  verificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiry: Date | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'int' })
  clinicId: number;

  @ManyToOne(() => Clinic, (clinic) => clinic.staffMembers, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @OneToOne(() => Dentist, (dentist) => dentist.staff)
  dentist: Dentist;

  @OneToOne(() => Nurse, (nurse) => nurse.staff)
  nurse: Nurse;

  @OneToOne(() => FrontDeskWorker, (frontDeskWorker) => frontDeskWorker.staff)
  frontDeskWorker: FrontDeskWorker;

  @OneToOne(() => Director, (director) => director.staff)
  director: Director;
}
