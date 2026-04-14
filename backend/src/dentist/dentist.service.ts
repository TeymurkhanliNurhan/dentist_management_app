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
}
