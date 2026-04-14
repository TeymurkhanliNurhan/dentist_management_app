import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Dentist } from '../../dentist/entities/dentist.entity';
import { Treatment } from '../../treatment/entities/treatment.entity';

@Entity({ name: 'Dentist_Treatment' })
export class DentistTreatment {
  @PrimaryColumn({ type: 'int', name: 'Treatment' })
  treatment: number;

  @PrimaryColumn({ type: 'int', name: 'Dentist' })
  dentist: number;

  @ManyToOne(() => Treatment, (treatment) => treatment.dentistTreatments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'Treatment' })
  treatmentEntity: Treatment;

  @ManyToOne(() => Dentist, (dentist) => dentist.dentistTreatments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'Dentist' })
  dentistEntity: Dentist;
}
