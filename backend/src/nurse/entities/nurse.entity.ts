import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';

@Entity({ name: 'Nurse' })
export class Nurse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  staffId: number;

  @OneToOne(() => Staff, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;

  @OneToMany(() => Randevue, (randevue) => randevue.nurse)
  randevues: Randevue[];
}
