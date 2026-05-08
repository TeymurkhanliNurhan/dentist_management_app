import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Room } from '../../room/entities/room.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum BlockingHoursApprovalStatus {
  AWAITING = 'awaiting',
  CANCELED = 'canceled',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

@Entity({ name: 'Blocking_hours' })
export class BlockingHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'staff', type: 'int', nullable: true })
  staffId: number | null;

  @Column({ name: 'room', type: 'int', nullable: true })
  roomId: number | null;

  @Column({ type: 'varchar', length: 127, nullable: true })
  name: string | null;

  @Column({
    type: 'enum',
    enum: BlockingHoursApprovalStatus,
    default: BlockingHoursApprovalStatus.AWAITING,
  })
  approvalStatus: BlockingHoursApprovalStatus;

  @ManyToOne(() => Staff, (staff) => staff.blockingHours, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'staff' })
  staff: Staff | null;

  @ManyToOne(() => Room, (room) => room.blockingHours, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'room' })
  room: Room | null;
}
