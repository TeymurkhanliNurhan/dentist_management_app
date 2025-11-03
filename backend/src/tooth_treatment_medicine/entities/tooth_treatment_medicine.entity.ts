import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Medicine } from '../../medicine/entities/medicine.entity';
import { ToothTreatment } from '../../tooth_treatment/entities/tooth_treatment.entity';

@Entity({ name: 'Tooth_Treatment_Medicine' })
export class ToothTreatmentMedicine {
    @PrimaryColumn({ type: 'int', name: 'Medicine' })
    medicine: number;

    @PrimaryColumn({ type: 'int', name: 'Tooth_Treatment' })
    toothTreatment: number;

    @ManyToOne(() => Medicine, (medicine) => medicine.toothTreatmentMedicines, { nullable: false })
    @JoinColumn({ name: 'Medicine' })
    medicineEntity: Medicine;

    @ManyToOne(() => ToothTreatment, (toothTreatment) => toothTreatment.toothTreatmentMedicines, { nullable: false })
    @JoinColumn({ name: 'Tooth_Treatment' })
    toothTreatmentEntity: ToothTreatment;
}

