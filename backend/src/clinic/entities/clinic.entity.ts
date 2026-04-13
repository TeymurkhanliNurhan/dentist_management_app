import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

@Entity({ name: 'Clinic' })
export class Clinic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 63 })
  name: string;

  @Column({ type: 'varchar', length: 127 })
  address: string;

  @OneToMany(() => Staff, (staff) => staff.clinic)
  staffMembers: Staff[];
}
