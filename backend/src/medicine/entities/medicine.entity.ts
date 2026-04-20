import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ToothTreatmentMedicine } from '../../tooth_treatment_medicine/entities/tooth_treatment_medicine.entity';
import { Clinic } from '../../clinic/entities/clinic.entity';

@Entity({ name: 'Medicine' })
export class Medicine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  @Column({ type: 'double precision' })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'double precision', default: 0 })
  purchasePrice: number;

  @OneToMany(() => ToothTreatmentMedicine, (ttm) => ttm.medicineEntity)
  toothTreatmentMedicines: ToothTreatmentMedicine[];

  @ManyToOne(() => Clinic, (clinic) => clinic.medicines, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;
}
