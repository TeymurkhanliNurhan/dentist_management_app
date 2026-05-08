import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

@Entity({ name: 'Salary' })
export class Salary {
  @PrimaryColumn({ type: 'int' })
  staffId: number;

  @Column({ type: 'double precision', nullable: true })
  salary: number | null;

  @Column({ type: 'int', nullable: true })
  salaryDay: number | null;

  @Column({ type: 'double precision', nullable: true })
  treatmentPercentage: number | null;

  @OneToOne(() => Staff, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;
}
