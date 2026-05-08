import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

@Entity({ name: 'Director' })
export class Director {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  staffId: number;

  @OneToOne(() => Staff, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;
}
