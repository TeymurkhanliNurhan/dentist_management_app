import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';
import { Clinic } from '../../clinic/entities/clinic.entity';
import { TreatmentPricePer } from '../treatment-price-per.enum';
import { DentistTreatment } from '../../dentist_treatment/entities/dentist_treatment.entity';

@Entity({ name: 'Treatment' })
export class Treatment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pricePer: TreatmentPricePer | null;

  @OneToMany(() => ToothTreatment, (tt) => tt.treatment)
  toothTreatments: ToothTreatment[];

  @OneToMany(() => DentistTreatment, (dt) => dt.treatmentEntity)
  dentistTreatments: DentistTreatment[];

  @ManyToOne(() => Clinic, (clinic) => clinic.treatments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;
}
