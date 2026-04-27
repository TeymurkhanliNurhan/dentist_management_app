import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { DentistRepository } from './dentist.repository';
import { LogWriter } from '../log-writer';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Dentist } from './entities/dentist.entity';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';
import { CreateDentistDto } from './dto/create-dentist.dto';
import { GetDentistDto } from './dto/get-dentist.dto';
import { GetDentistFinanceDto } from './dto/get-dentist-finance.dto';
import { Salary } from '../salary/entities/salary.entity';
import { BlockingHoursApprovalStatus } from '../blocking_hours/entities/blocking_hours.entity';

@Injectable()
export class DentistService {
  private readonly logger = new Logger(DentistService.name);

  constructor(
    private readonly dentistRepository: DentistRepository,
    private readonly dataSource: DataSource,
  ) {}

  private sanitizeDentist(dentist: Dentist) {
    return {
      id: dentist.id,
      staffId: dentist.staffId,
      staff: {
        id: dentist.staff.id,
        name: dentist.staff.name,
        surname: dentist.staff.surname,
        birthDate: dentist.staff.birthDate,
        gmail: dentist.staff.gmail,
        isEmailVerified: dentist.staff.isEmailVerified,
        verificationCode: dentist.staff.verificationCode,
        verificationCodeExpiry: dentist.staff.verificationCodeExpiry,
        active: dentist.staff.active,
        startDate: dentist.staff.startDate,
        endDate: dentist.staff.endDate,
        clinicId: dentist.staff.clinicId,
      },
    };
  }

  async create(requesterDentistId: number, createDentistDto: CreateDentistDto) {
    const requester = await this.dentistRepository.findById(requesterDentistId);
    if (!requester) {
      throw new NotFoundException(
        `Dentist with id ${requesterDentistId} not found`,
      );
    }

    const existingStaff = await this.dentistRepository.findStaffById(
      createDentistDto.staffId,
    );
    if (!existingStaff) {
      throw new NotFoundException(
        `Staff with id ${createDentistDto.staffId} not found`,
      );
    }
    if (existingStaff.clinicId !== requester.staff.clinicId) {
      throw new BadRequestException(
        'Cannot create dentist for staff from another clinic',
      );
    }
    const alreadyDentist = await this.dentistRepository.findByStaffId(
      createDentistDto.staffId,
    );
    if (alreadyDentist) {
      throw new BadRequestException('Dentist already exists for this staff');
    }

    const created = await this.dentistRepository.createWithExistingStaff(
      createDentistDto.staffId,
    );

    const msg = `Dentist with id ${created.id} created`;
    this.logger.log(msg);
    LogWriter.append('log', DentistService.name, msg);
    return this.sanitizeDentist(created);
  }

  async findOne(id: number) {
    const dentist = await this.dentistRepository.findById(id);
    if (!dentist) {
      this.logger.warn(`Dentist with id ${id} not found`);
      LogWriter.append(
        'warn',
        DentistService.name,
        `Dentist with id ${id} not found`,
      );
      throw new NotFoundException(`Dentist with id ${id} not found`);
    }
    const dentistWithoutPassword = this.sanitizeDentist(dentist);
    this.logger.log(`Dentist with id ${id} retrieved`);
    LogWriter.append(
      'log',
      DentistService.name,
      `Dentist with id ${id} retrieved`,
    );
    return dentistWithoutPassword;
  }

  async findAll(requesterDentistId: number, dto: GetDentistDto) {
    const requester = await this.dentistRepository.findById(requesterDentistId);
    if (!requester) {
      throw new NotFoundException(
        `Dentist with id ${requesterDentistId} not found`,
      );
    }

    const dentists = await this.dentistRepository.findAllByClinicWithFilters(
      requester.staff.clinicId,
      dto,
    );
    const sanitized = dentists.map((dentist) => this.sanitizeDentist(dentist));
    const msg = `Dentist with id ${requesterDentistId} retrieved ${sanitized.length} dentist(s)`;
    this.logger.log(msg);
    LogWriter.append('log', DentistService.name, msg);
    return sanitized;
  }

  async update(id: number, updateDentistDto: UpdateDentistDto) {
    const dentist = await this.dentistRepository.findById(id);
    if (!dentist) {
      this.logger.warn(`Dentist with id ${id} not found`);
      LogWriter.append(
        'warn',
        DentistService.name,
        `Dentist with id ${id} not found`,
      );
      throw new NotFoundException(`Dentist with id ${id} not found`);
    }

    const staffUpdates: Partial<Dentist['staff']> = {};
    if (updateDentistDto.name !== undefined) {
      staffUpdates.name = updateDentistDto.name;
    }
    if (updateDentistDto.surname !== undefined) {
      staffUpdates.surname = updateDentistDto.surname;
    }
    if (updateDentistDto.birthDate !== undefined) {
      staffUpdates.birthDate = new Date(updateDentistDto.birthDate);
    }

    if (Object.keys(staffUpdates).length > 0) {
      await this.dataSource
        .getRepository(Staff)
        .update(dentist.staffId, staffUpdates);
    }
    const updated = await this.dentistRepository.findById(id);
    if (!updated) {
      throw new NotFoundException(`Dentist with id ${id} not found`);
    }
    const dentistWithoutPassword = this.sanitizeDentist(updated);
    this.logger.log(`Dentist with id ${id} updated`);
    LogWriter.append(
      'log',
      DentistService.name,
      `Dentist with id ${id} updated`,
    );
    return dentistWithoutPassword;
  }

  async updatePassword(id: number, updatePasswordDto: UpdatePasswordDto) {
    const dentist = await this.dentistRepository.findById(id);
    if (!dentist) {
      this.logger.warn(`Dentist with id ${id} not found`);
      LogWriter.append(
        'warn',
        DentistService.name,
        `Dentist with id ${id} not found`,
      );
      throw new NotFoundException(`Dentist with id ${id} not found`);
    }

    if (updatePasswordDto.newPassword !== updatePasswordDto.confirmPassword) {
      this.logger.warn(
        `Password update failed: passwords do not match for dentist ${id}`,
      );
      LogWriter.append(
        'warn',
        DentistService.name,
        `Password update failed: passwords do not match for dentist ${id}`,
      );
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      dentist.staff.password,
    );
    if (!isCurrentPasswordValid) {
      this.logger.warn(
        `Password update failed: invalid current password for dentist ${id}`,
      );
      LogWriter.append(
        'warn',
        DentistService.name,
        `Password update failed: invalid current password for dentist ${id}`,
      );
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(
      updatePasswordDto.newPassword,
      10,
    );
    await this.dataSource
      .getRepository(Staff)
      .update(dentist.staffId, { password: hashedNewPassword });
    this.logger.log(`Password updated for dentist with id ${id}`);
    LogWriter.append(
      'log',
      DentistService.name,
      `Password updated for dentist with id ${id}`,
    );
    return { message: 'Password updated successfully' };
  }

  logProfileAccess(dentistId: number) {
    const msg = `Dentist with id ${dentistId} accessed profile`;
    this.logger.debug(msg);
    LogWriter.append('debug', DentistService.name, msg);
  }

  async delete(id: number) {
    const deleted = await this.dentistRepository.removeById(id);
    if (!deleted) {
      throw new NotFoundException(`Dentist with id ${id} not found`);
    }

    await this.dataSource.getRepository(Staff).update(deleted.staffId, {
      active: false,
      endDate: new Date(),
    });

    const msg = `Dentist with id ${id} deleted`;
    this.logger.log(msg);
    LogWriter.append('log', DentistService.name, msg);
    return { message: 'Dentist deleted successfully' };
  }

  /** Same CTE as dentist finance overview (effectiveDate + joins). */
  private dentistTreatmentFinanceBaseCte(): string {
    return `
      WITH TreatmentEffectiveDates AS (
        SELECT
          tt.id,
          tt."feeSnapshot",
          t.name AS "treatmentName",
          a.id AS appointment_id,
          a."startDate" AS "appointmentDate",
          p.name AS patient_name,
          p.surname AS patient_surname,
          COALESCE(MAX(r.date), a."startDate") AS "effectiveDate"
        FROM "Tooth_Treatment" tt
        JOIN "Treatment" t ON t.id = tt.treatment
        JOIN "Appointment" a ON a.id = tt.appointment
        JOIN "Patient" p ON p.id = a.patient
        LEFT JOIN "ToothTreatmentTeeth" ttt ON ttt.tooth_treatment_id = tt.id
        LEFT JOIN "Treatment_Randevue" tr ON tr.tooth_treatment_teeth_id = ttt.id
        LEFT JOIN "Randevue" r ON r.id = tr.randevue_id
        WHERE tt.dentist = $1
        GROUP BY tt.id, tt."feeSnapshot", t.name, a.id, a."startDate", p.name, p.surname
      )`;
  }

  async getDashboardOverview(dentistId: number) {
    const dentist = await this.dentistRepository.findById(dentistId);
    if (!dentist) throw new NotFoundException('Dentist not found');

    const now = new Date();
    const financeOverview = await this.getFinanceOverview(dentistId, {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });

    const [todayTreatmentsRows, randevuesRows, blockingRows] = await Promise.all([
      this.dataSource.query(
        `
          ${this.dentistTreatmentFinanceBaseCte()}
          SELECT
            appointment_id,
            patient_name,
            patient_surname,
            "treatmentName",
            "appointmentDate" AS date,
            ("feeSnapshot" * $2 / 100) AS benefit
          FROM TreatmentEffectiveDates
          WHERE DATE("appointmentDate" AT TIME ZONE 'UTC')
            = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
          ORDER BY "effectiveDate" DESC
        `,
        [dentistId, financeOverview.commissionRate],
      ),
      this.dataSource.query(
        `
          SELECT
            r.id,
            r.date AS "startTime",
            r."endTime",
            p.name AS "patientName",
            p.surname AS "patientSurname"
          FROM "Randevue" r
          LEFT JOIN "Patient" p ON p.id = r.patient
          WHERE r.dentist = $1
            AND DATE(r.date) = CURRENT_DATE
          ORDER BY r.date ASC
        `,
        [dentistId],
      ),
      this.dataSource.query(
        `
          SELECT
            bh.id,
            bh."startTime",
            bh."endTime",
            bh.name,
            bh."approvalStatus"
          FROM "Blocking_hours" bh
          WHERE bh.staff = $1
            AND bh."approvalStatus" IN ($2, $3)
            AND bh."startTime" < (CURRENT_DATE + INTERVAL '1 day')
            AND bh."endTime" > CURRENT_DATE
          ORDER BY bh."startTime" ASC
        `,
        [dentist.staffId, BlockingHoursApprovalStatus.AWAITING, BlockingHoursApprovalStatus.APPROVED],
      ),
    ]);

    const todayTreatmentCount = todayTreatmentsRows.length;
    const todayRevenue = todayTreatmentsRows.reduce(
      (sum, row: { benefit: string | number | null }) =>
        sum + Number(row.benefit ?? 0),
      0,
    );

    return {
      commissionRate: financeOverview.commissionRate,
      todayTreatmentCount,
      todayRevenue,
      monthRevenue: financeOverview.monthlyCommission,
      todayTreatments: todayTreatmentsRows.map(
        (row: {
          appointment_id: number;
          patient_name: string | null;
          patient_surname: string | null;
          treatmentName: string;
          date: string;
          benefit: number;
        }) => ({
          appointmentId: Number(row.appointment_id),
          patientName: `${row.patient_name ?? ''} ${row.patient_surname ?? ''}`.trim() || 'Unknown patient',
          treatmentName: row.treatmentName,
          benefit: Number(row.benefit ?? 0),
          date: row.date,
        }),
      ),
      todayRandevues: randevuesRows.map(
        (row: {
          id: number;
          startTime: string;
          endTime: string;
          patientName: string | null;
          patientSurname: string | null;
        }) => ({
          id: Number(row.id),
          startTime: row.startTime,
          endTime: row.endTime,
          patientName: `${row.patientName ?? ''} ${row.patientSurname ?? ''}`.trim() || 'Unknown patient',
        }),
      ),
      todayBlockingHours: blockingRows.map(
        (row: {
          id: number;
          startTime: string;
          endTime: string;
          name: string | null;
          approvalStatus: string;
        }) => ({
          id: Number(row.id),
          startTime: row.startTime,
          endTime: row.endTime,
          name: row.name ?? 'Blocking hour',
          approvalStatus: row.approvalStatus,
        }),
      ),
    };
  }

  async getFinanceOverview(dentistId: number, dto: GetDentistFinanceDto) {
    const dentist = await this.dentistRepository.findById(dentistId);
    if (!dentist) throw new NotFoundException('Dentist not found');

    const year = dto.year ?? new Date().getFullYear();
    const month = dto.month ?? new Date().getMonth() + 1;

    const salary = await this.dataSource.getRepository(Salary).findOne({
      where: { staffId: dentist.staffId },
    });
    const commissionRate = salary?.treatmentPercentage ?? 0;

    const baseCte = this.dentistTreatmentFinanceBaseCte();

    const [monthStats, dailyGraph, weeklyGraph, monthlyGraph, recentTreatments] = await Promise.all([
      this.dataSource.query(`
        ${baseCte}
        SELECT 
          "treatmentName",
          COUNT(*) AS count,
          SUM("feeSnapshot") AS total_fee
        FROM TreatmentEffectiveDates
        WHERE EXTRACT(YEAR FROM "effectiveDate" AT TIME ZONE 'UTC') = $2
          AND EXTRACT(MONTH FROM "effectiveDate" AT TIME ZONE 'UTC') = $3
        GROUP BY "treatmentName"
        ORDER BY count DESC
      `, [dentistId, year, month]),
      
      this.dataSource.query(`
        ${baseCte}
        SELECT 
          EXTRACT(ISODOW FROM "effectiveDate" AT TIME ZONE 'UTC') AS day,
          SUM("feeSnapshot") AS total_fee
        FROM TreatmentEffectiveDates
        WHERE EXTRACT(YEAR FROM "effectiveDate" AT TIME ZONE 'UTC') = $2
          AND EXTRACT(MONTH FROM "effectiveDate" AT TIME ZONE 'UTC') = $3
        GROUP BY EXTRACT(ISODOW FROM "effectiveDate" AT TIME ZONE 'UTC')
        ORDER BY day ASC
      `, [dentistId, year, month]),

      this.dataSource.query(`
        ${baseCte}
        SELECT 
          CEIL(EXTRACT(DAY FROM "effectiveDate" AT TIME ZONE 'UTC') / 7.0) AS week,
          SUM("feeSnapshot") AS total_fee
        FROM TreatmentEffectiveDates
        WHERE EXTRACT(YEAR FROM "effectiveDate" AT TIME ZONE 'UTC') = $2
          AND EXTRACT(MONTH FROM "effectiveDate" AT TIME ZONE 'UTC') = $3
        GROUP BY CEIL(EXTRACT(DAY FROM "effectiveDate" AT TIME ZONE 'UTC') / 7.0)
        ORDER BY week ASC
      `, [dentistId, year, month]),

      this.dataSource.query(`
        ${baseCte}
        SELECT 
          EXTRACT(MONTH FROM "effectiveDate" AT TIME ZONE 'UTC') AS month,
          SUM("feeSnapshot") AS total_fee
        FROM TreatmentEffectiveDates
        WHERE EXTRACT(YEAR FROM "effectiveDate" AT TIME ZONE 'UTC') = $2
        GROUP BY EXTRACT(MONTH FROM "effectiveDate" AT TIME ZONE 'UTC')
        ORDER BY month ASC
      `, [dentistId, year]),

      this.dataSource.query(`
        ${baseCte}
        SELECT 
          appointment_id,
          patient_name,
          patient_surname,
          "appointmentDate" AS date,
          json_agg(json_build_object('name', "treatmentName", 'fee', "feeSnapshot")) AS treatments
        FROM TreatmentEffectiveDates
        WHERE EXTRACT(YEAR FROM "effectiveDate" AT TIME ZONE 'UTC') = $2
          AND EXTRACT(MONTH FROM "effectiveDate" AT TIME ZONE 'UTC') = $3
        GROUP BY appointment_id, patient_name, patient_surname, "appointmentDate"
        ORDER BY date DESC
      `, [dentistId, year, month])
    ]);

    let monthlyCommission = 0;
    let totalTreatments = 0;
    const treatmentMix: any[] = [];
    
    monthStats.forEach((stat: any) => {
      const fee = Number(stat.total_fee);
      const count = Number(stat.count);
      const comm = fee * (commissionRate / 100);
      
      monthlyCommission += comm;
      totalTreatments += count;
      
      treatmentMix.push({
        name: stat.treatmentName,
        count,
        commission: comm,
      });
    });

    const topTwo = treatmentMix.slice(0, 2);
    const otherTreatments = treatmentMix.slice(2);
    const otherCount = otherTreatments.reduce((acc, curr) => acc + curr.count, 0);
    const otherCommission = otherTreatments.reduce((acc, curr) => acc + curr.commission, 0);

    const treatmentsOperated = {
      total: totalTreatments,
      breakdown: [
        ...topTwo.map(t => ({ name: t.name, count: t.count })),
        ...(otherCount > 0 ? [{ name: 'Other', count: otherCount }] : [])
      ]
    };

    return {
      period: { year, month },
      commissionRate,
      monthlyCommission,
      treatmentsOperated,
      treatmentMix: treatmentMix.map(t => ({
        name: t.name,
        commission: t.commission,
        percentage: monthlyCommission > 0 ? (t.commission / monthlyCommission) * 100 : 0
      })),
      graphs: {
        daily: dailyGraph.map((d: any) => ({
          day: Number(d.day),
          commission: Number(d.total_fee) * (commissionRate / 100)
        })),
        weekly: weeklyGraph.map((w: any) => ({
          week: Number(w.week),
          commission: Number(w.total_fee) * (commissionRate / 100)
        })),
        monthly: monthlyGraph.map((m: any) => ({
          month: Number(m.month),
          commission: Number(m.total_fee) * (commissionRate / 100)
        }))
      },
      recentOperatedTreatments: recentTreatments.map((r: any) => {
        const trs = r.treatments as Array<{name: string, fee: number}>;
        const totalFee = trs.reduce((acc, curr) => acc + curr.fee, 0);
        const commission = totalFee * (commissionRate / 100);
        
        const counts: Record<string, number> = {};
        trs.forEach(t => { counts[t.name] = (counts[t.name] || 0) + 1; });
        const treatmentNames = Object.entries(counts).map(([name, count]) => 
          count > 1 ? `${name} x${count}` : name
        ).join(', ');

        return {
          appointmentId: r.appointment_id,
          patientInitials: `${r.patient_name[0] ?? ''}${r.patient_surname[0] ?? ''}`.toUpperCase(),
          patientName: `${r.patient_name} ${r.patient_surname}`,
          treatmentList: treatmentNames,
          date: r.date,
          totalCost: totalFee,
          commission
        };
      })
    };
  }
}
