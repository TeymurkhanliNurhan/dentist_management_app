import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Clinic } from '../../clinic/entities/clinic.entity';

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
}
