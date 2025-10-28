import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PatientTooth } from '../../patient_tooth/entities/patient_tooth.entity';

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

    @Column({ type: 'varchar', length: 30 })
    name: string;

    @OneToMany(() => PatientTooth, (pt) => pt.tooth)
    patientTeeth: PatientTooth[];
}


