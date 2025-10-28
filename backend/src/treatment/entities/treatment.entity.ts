import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';

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
}


