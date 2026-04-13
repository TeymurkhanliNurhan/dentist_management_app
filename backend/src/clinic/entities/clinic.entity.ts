import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Medicine } from '../../medicine/entities/medicine.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { Room } from '../../room/entities/room.entity';

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

  @OneToMany(() => Medicine, (medicine) => medicine.clinic)
  medicines: Medicine[];

  @OneToMany(() => Patient, (patient) => patient.clinic)
  patients: Patient[];

  @OneToMany(() => Room, (room) => room.clinic)
  rooms: Room[];
}
