import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Medicine } from '../../medicine/entities/medicine.entity';
import { PaymentDetails } from '../../payment_details/entities/payment_details.entity';

@Entity({ name: 'Purchase_Medicine' })
export class PurchaseMedicine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  count: number;

  @Column({ type: 'double precision' })
  pricePerOne: number;

  @Column({ type: 'double precision' })
  totalPrice: number;

  @ManyToOne(() => Medicine, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'medicineId' })
  medicine: Medicine;

  @ManyToOne(
    () => PaymentDetails,
    (paymentDetails) => paymentDetails.purchaseMedicineRecords,
    {
      nullable: false,
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'paymentDetailsId' })
  paymentDetails: PaymentDetails;
}
