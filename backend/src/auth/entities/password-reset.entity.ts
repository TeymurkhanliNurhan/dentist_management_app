import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class PasswordReset {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    code: string;

    @Column({ default: false })
    verified: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
