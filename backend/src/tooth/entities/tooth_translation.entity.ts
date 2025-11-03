import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Tooth } from './tooth.entity';

@Entity({ name: 'Tooth_Translation' })
export class ToothTranslation {
    @PrimaryColumn({ type: 'int', name: 'tooth' })
    tooth: number;

    @OneToOne(() => Tooth, (t) => t.translation, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tooth', referencedColumnName: 'id' })
    toothEntity: Tooth;

    @Column({ type: 'varchar', length: 30, name: 'name_in_english' })
    nameInEnglish: string;

    @Column({ type: 'varchar', length: 30, name: 'name_in_azerbaijani' })
    nameInAzerbaijani: string;

    @Column({ type: 'varchar', length: 30, name: 'name_in_russian' })
    nameInRussian: string;
}


