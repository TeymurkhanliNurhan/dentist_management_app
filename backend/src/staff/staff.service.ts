import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StaffRepository } from './staff.repository';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { LogWriter } from '../log-writer';
import { Staff } from './entities/staff.entity';
import { GetStaffDto } from './dto/get-staff.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private readonly repo: StaffRepository) {}

  private mapResponse(staff: Staff) {
    return {
      id: staff.id,
      name: staff.name,
      surname: staff.surname,
      birthDate: staff.birthDate,
      gmail: staff.gmail,
      isEmailVerified: staff.isEmailVerified,
      verificationCodeExpiry: staff.verificationCodeExpiry,
      active: staff.active,
      startDate: staff.startDate,
      endDate: staff.endDate,
      clinicId: staff.clinicId,
    };
  }

  async findAll(requesterDentistId: number, dto: GetStaffDto) {
    const clinicId = await this.repo.getClinicIdForDentist(requesterDentistId);
    const staffMembers = await this.repo.findAllInClinicWithFilters(
      clinicId,
      dto,
    );
    const msg = `Dentist ${requesterDentistId} retrieved ${staffMembers.length} staff member(s)`;
    this.logger.log(msg);
    LogWriter.append('log', StaffService.name, msg);
    return staffMembers.map((staff) => this.mapResponse(staff));
  }

  async create(requesterDentistId: number, dto: CreateStaffDto) {
    const clinicId = await this.repo.getClinicIdForDentist(requesterDentistId);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      const created = await this.repo.createForClinic({
        name: dto.name,
        surname: dto.surname,
        birthDate: new Date(dto.birthDate),
        gmail: dto.gmail,
        password: hashedPassword,
        isEmailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        active: dto.active ?? true,
        startDate: new Date(dto.startDate),
        endDate: null,
        clinicId,
      });

      const msg = `Dentist ${requesterDentistId} created staff ${created.id}`;
      this.logger.log(msg);
      LogWriter.append('log', StaffService.name, msg);
      return this.mapResponse(created);
    } catch {
      throw new BadRequestException('Failed to create staff');
    }
  }

  async update(requesterDentistId: number, id: number, dto: UpdateStaffDto) {
    const clinicId = await this.repo.getClinicIdForDentist(requesterDentistId);
    const staff = await this.repo.findByIdInClinic(id, clinicId);
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    if (dto.name !== undefined) staff.name = dto.name;
    if (dto.surname !== undefined) staff.surname = dto.surname;
    if (dto.birthDate !== undefined) staff.birthDate = new Date(dto.birthDate);
    if (dto.gmail !== undefined) staff.gmail = dto.gmail;
    if (dto.password !== undefined) {
      staff.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.active !== undefined) staff.active = dto.active;
    if (dto.startDate !== undefined) staff.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) staff.endDate = new Date(dto.endDate);

    const updated = await this.repo.update(staff);
    const msg = `Dentist ${requesterDentistId} updated staff ${id}`;
    this.logger.log(msg);
    LogWriter.append('log', StaffService.name, msg);
    return this.mapResponse(updated);
  }

  async delete(requesterDentistId: number, id: number) {
    const clinicId = await this.repo.getClinicIdForDentist(requesterDentistId);
    const staff = await this.repo.findByIdInClinic(id, clinicId);
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    staff.active = false;
    staff.endDate = new Date();
    await this.repo.update(staff);

    const msg = `Dentist ${requesterDentistId} deleted staff ${id}`;
    this.logger.log(msg);
    LogWriter.append('log', StaffService.name, msg);
    return { message: 'Staff deleted successfully' };
  }
}
