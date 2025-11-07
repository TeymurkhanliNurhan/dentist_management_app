import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DentistRepository } from './dentist.repository';
import { LogWriter } from '../log-writer';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { Dentist } from './entities/dentist.entity';

@Injectable()
export class DentistService {
    private readonly logger = new Logger(DentistService.name);

    constructor(private readonly dentistRepository: DentistRepository) {}

    async findOne(id: number) {
        const dentist = await this.dentistRepository.findById(id);
        if (!dentist) {
            this.logger.warn(`Dentist with id ${id} not found`);
            LogWriter.append('warn', DentistService.name, `Dentist with id ${id} not found`);
            throw new NotFoundException(`Dentist with id ${id} not found`);
        }
        const { password, ...dentistWithoutPassword } = dentist;
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

        const updates: Partial<Dentist> = {};
        if (updateDentistDto.name !== undefined) {
            updates.name = updateDentistDto.name;
        }
        if (updateDentistDto.surname !== undefined) {
            updates.surname = updateDentistDto.surname;
        }
        if (updateDentistDto.birthDate !== undefined) {
            updates.birthDate = new Date(updateDentistDto.birthDate);
        }

        const updated = await this.dentistRepository.update(id, updates);
        const { password, ...dentistWithoutPassword } = updated;
        this.logger.log(`Dentist with id ${id} updated`);
        LogWriter.append('log', DentistService.name, `Dentist with id ${id} updated`);
        return dentistWithoutPassword;
    }

    logProfileAccess(dentistId: number) {
        const msg = `Dentist with id ${dentistId} accessed profile`;
        this.logger.debug(msg);
        LogWriter.append('debug', DentistService.name, msg);
    }
}
