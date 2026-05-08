import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

@Entity({ name: 'Working_hours' })
export class WorkingHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ name: 'staff', type: 'int' })
  staffId: number;

  @ManyToOne(() => Staff, (staff) => staff.workingHours, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'staff' })
  staff: Staff;
}
