import {Entity, PrimaryGeneratedColumn, Column, OneToMany}  from 'typeorm';
import { Patient } from '../../patient/entities/patient.entity';

@Entity({name: 'Dentist'})
export class Dentist {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'varchar', length:20})
    name: string;

    @Column({type: 'varchar', length:20})
    surname: string;

    @Column({type: 'date'})
    date: Date;

    @Column({type: 'varchar', length: 40})
    gmail: string;

    @Column({type: 'varchar',length: 256})
    password: string;

    @OneToMany(()=> Patient, (patient)=> patient.dentist)
    patients: Patient[];
}