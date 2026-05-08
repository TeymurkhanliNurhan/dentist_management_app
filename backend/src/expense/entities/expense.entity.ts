import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Clinic } from '../../clinic/entities/clinic.entity';
import { PaymentDetails } from '../../payment_details/entities/payment_details.entity';

@Entity({ name: 'Expense' })
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 127 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', nullable: true })
  fixedCost: number | null;

  @Column({ type: 'int', nullable: true })
  dayOfMonth: number | null;

  @ManyToOne(() => Clinic, (clinic) => clinic.expenses, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  @OneToMany(() => PaymentDetails, (paymentDetails) => paymentDetails.expense)
  paymentDetailsRecords: PaymentDetails[];
}
