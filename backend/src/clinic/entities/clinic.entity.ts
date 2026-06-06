import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Medicine } from '../../medicine/entities/medicine.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { Room } from '../../room/entities/room.entity';
import { Treatment } from '../../treatment/entities/treatment.entity';
import { Expense } from '../../expense/entities/expense.entity';

@Entity({ name: 'Clinic' })
export class Clinic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 63 })
  name: string;

  @Column({ type: 'varchar', length: 127 })
  address: string;

  @Column({ type: 'boolean', default: false })
  whatsappEnabled: boolean;

  @Column({ type: 'varchar', length: 32, nullable: true })
  whatsappPhoneNumberId: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  whatsappBusinessAccountId: string | null;

  @Column({ type: 'text', nullable: true })
  whatsappAccessToken: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsappDisplayPhone: string | null;

  @OneToMany(() => Staff, (staff) => staff.clinic)
  staffMembers: Staff[];

  @OneToMany(() => Medicine, (medicine) => medicine.clinic)
  medicines: Medicine[];

  @OneToMany(() => Treatment, (treatment) => treatment.clinic)
  treatments: Treatment[];

  @OneToMany(() => Patient, (patient) => patient.clinic)
  patients: Patient[];

  @OneToMany(() => Room, (room) => room.clinic)
  rooms: Room[];

  @OneToMany(() => Expense, (expense) => expense.clinic)
  expenses: Expense[];
}
