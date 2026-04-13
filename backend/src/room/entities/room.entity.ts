import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BlockingHours } from '../../blocking_hours/entities/blocking_hours.entity';

@Entity({ name: 'Room' })
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 15 })
  number: string;

  @Column({ type: 'text' })
  description: string;

  @OneToMany(() => BlockingHours, (blockingHours) => blockingHours.room)
  blockingHours: BlockingHours[];
}
