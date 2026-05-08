import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatmentTeeth } from '../../tooth_treatment_teeth/entities/tooth_treatment_teeth.entity';
import { Randevue } from '../../randevue/entities/randevue.entity';

@Entity({ name: 'Treatment_Randevue' })
export class TreatmentRandevue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ToothTreatmentTeeth, (ttt) => ttt.treatmentRandevues, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tooth_treatment_teeth_id' })
  toothTreatmentTeeth: ToothTreatmentTeeth;

  @ManyToOne(() => Randevue, (randevue) => randevue.treatmentRandevues, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'randevue_id' })
  randevue: Randevue;
}
