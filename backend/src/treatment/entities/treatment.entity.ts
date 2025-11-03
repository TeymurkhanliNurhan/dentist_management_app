import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';
import { Dentist } from '../../dentist/entities/dentist.entity';

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

    @OneToMany(() => ToothTreatment, (tt) => tt.treatment)
    toothTreatments: ToothTreatment[];

    @ManyToOne(() => Dentist, (dentist) => dentist.treatments, { nullable: false })
    @JoinColumn({ name: 'dentist' })
    dentist: Dentist;
}


