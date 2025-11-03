import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';
import { ToothTranslation } from './tooth_translation.entity';

@Entity({ name: 'Tooth' })
export class Tooth {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    number: number;

    @Column({ type: 'boolean' })
    permanent: boolean;

    @Column({ type: 'boolean' })
    upper_jaw: boolean;

    @OneToMany(() => PatientTooth, (pt) => pt.tooth)
    patientTeeth: PatientTooth[];

    @OneToOne(() => ToothTranslation, (tr) => tr.toothEntity, { cascade: true })
    @JoinColumn({ name: 'id', referencedColumnName: 'tooth' })
    translation: ToothTranslation;
}


