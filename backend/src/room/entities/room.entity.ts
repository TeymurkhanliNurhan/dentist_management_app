import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BlockingHours } from '../../blocking_hours/entities/blocking_hours.entity';
import { Clinic } from '../../clinic/entities/clinic.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';

@Entity({ name: 'Room' })
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 15 })
  number: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  clinicId: number;

  @ManyToOne(() => Clinic, (clinic) => clinic.rooms, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @OneToMany(() => BlockingHours, (blockingHours) => blockingHours.room)
  blockingHours: BlockingHours[];

  @OneToMany(() => Randevue, (randevue) => randevue.room)
  randevues: Randevue[];
}
