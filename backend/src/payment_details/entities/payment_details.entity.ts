import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expense } from '../../expense/entities/expense.entity';
import { Salary } from '../../salary/entities/salary.entity';
import { PurchaseMedicine } from '../../purchase_medicine/entities/purchase_medicine.entity';

@Entity({ name: 'PaymentDetails' })
export class PaymentDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'double precision' })
  cost: number;

  @ManyToOne(() => Expense, (expense) => expense.paymentDetailsRecords, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'expenseId' })
  expense: Expense | null;

  @ManyToOne(() => Salary, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'salaryId', referencedColumnName: 'staffId' })
  salary: Salary | null;

  @OneToMany(
    () => PurchaseMedicine,
    (purchaseMedicine) => purchaseMedicine.paymentDetails,
  )
  purchaseMedicineRecords: PurchaseMedicine[];
}
