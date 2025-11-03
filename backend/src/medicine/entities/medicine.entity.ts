import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatmentMedicine } from '../../tooth_treatment_medicine/entities/tooth_treatment_medicine.entity';
import { Dentist } from '../../dentist/entities/dentist.entity';

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

    @OneToMany(() => ToothTreatmentMedicine, (ttm) => ttm.medicineEntity)
    toothTreatmentMedicines: ToothTreatmentMedicine[];

    @ManyToOne(() => Dentist, (dentist) => dentist.medicines, { nullable: false })
    @JoinColumn({ name: 'dentist' })
    dentist: Dentist;
}

