import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';

@Entity({ name: 'Media' })
export class Media {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    photo_url: number;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @ManyToOne(() => ToothTreatment, (toothTreatment) => toothTreatment.medias, { nullable: false })
    @JoinColumn({ name: 'Tooth_Treatment_id' })
    toothTreatment: ToothTreatment;
}