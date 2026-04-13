import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { DentistRepository } from './dentist.repository';
import { LogWriter } from '../log-writer';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Dentist } from './entities/dentist.entity';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class DentistService {
    private readonly logger = new Logger(DentistService.name);

    constructor(
        private readonly dentistRepository: DentistRepository,
        private readonly dataSource: DataSource,
    ) {}

    async findOne(id: number) {
        const dentist = await this.dentistRepository.findById(id);
        if (!dentist) {
            this.logger.warn(`Dentist with id ${id} not found`);
            LogWriter.append('warn', DentistService.name, `Dentist with id ${id} not found`);
            throw new NotFoundException(`Dentist with id ${id} not found`);
        }
        const { password: _password, ...staffWithoutPassword } = dentist.staff;
        const dentistWithoutPassword = {
            id: dentist.id,
            staffId: dentist.staffId,
            staff: staffWithoutPassword,
        };
        this.logger.log(`Dentist with id ${id} retrieved`);
        LogWriter.append('log', DentistService.name, `Dentist with id ${id} retrieved`);
        return dentistWithoutPassword;
    }

    async update(id: number, updateDentistDto: UpdateDentistDto) {
        const dentist = await this.dentistRepository.findById(id);
        if (!dentist) {
            this.logger.warn(`Dentist with id ${id} not found`);
            LogWriter.append('warn', DentistService.name, `Dentist with id ${id} not found`);
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
            await this.dataSource.getRepository(Staff).update(dentist.staffId, staffUpdates);
        }
        const updated = await this.dentistRepository.findById(id);
        if (!updated) {
            throw new NotFoundException(`Dentist with id ${id} not found`);
        }
        const { password: _updatedPassword, ...updatedStaffWithoutPassword } = updated.staff;
        const dentistWithoutPassword = {
            id: updated.id,
            staffId: updated.staffId,
            staff: updatedStaffWithoutPassword,
        };
        this.logger.log(`Dentist with id ${id} updated`);
        LogWriter.append('log', DentistService.name, `Dentist with id ${id} updated`);
        return dentistWithoutPassword;
    }

    async updatePassword(id: number, updatePasswordDto: UpdatePasswordDto) {
        const dentist = await this.dentistRepository.findById(id);
        if (!dentist) {
            this.logger.warn(`Dentist with id ${id} not found`);
            LogWriter.append('warn', DentistService.name, `Dentist with id ${id} not found`);
            throw new NotFoundException(`Dentist with id ${id} not found`);
        }

        if (updatePasswordDto.newPassword !== updatePasswordDto.confirmPassword) {
            this.logger.warn(`Password update failed: passwords do not match for dentist ${id}`);
            LogWriter.append('warn', DentistService.name, `Password update failed: passwords do not match for dentist ${id}`);
            throw new BadRequestException('New password and confirm password do not match');
        }

        const isCurrentPasswordValid = await bcrypt.compare(updatePasswordDto.currentPassword, dentist.staff.password);
        if (!isCurrentPasswordValid) {
            this.logger.warn(`Password update failed: invalid current password for dentist ${id}`);
            LogWriter.append('warn', DentistService.name, `Password update failed: invalid current password for dentist ${id}`);
            throw new UnauthorizedException('Current password is incorrect');
        }

        const hashedNewPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
        await this.dataSource.getRepository(Staff).update(dentist.staffId, { password: hashedNewPassword });
        this.logger.log(`Password updated for dentist with id ${id}`);
        LogWriter.append('log', DentistService.name, `Password updated for dentist with id ${id}`);
        return { message: 'Password updated successfully' };
    }

    logProfileAccess(dentistId: number) {
        const msg = `Dentist with id ${dentistId} accessed profile`;
        this.logger.debug(msg);
        LogWriter.append('debug', DentistService.name, msg);
    }
}
