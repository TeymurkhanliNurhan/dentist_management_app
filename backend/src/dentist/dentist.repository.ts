import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Dentist } from './entities/dentist.entity';
import { LogWriter } from '../log-writer';

@Injectable()
export class DentistRepository {
	private readonly logger = new Logger(DentistRepository.name);

	constructor(private readonly dataSource: DataSource) {}

	findAll() {
		this.logger.debug('findAll called');
		LogWriter.append('debug', DentistRepository.name, 'findAll called');
		return [];
	}

	async findById(id: number): Promise<Dentist | null> {
		this.logger.debug(`findById called with id ${id}`);
		LogWriter.append('debug', DentistRepository.name, `findById called with id ${id}`);
		const repository = this.dataSource.getRepository(Dentist);
		return repository.findOne({ where: { id } });
	}

	async update(id: number, updates: Partial<Dentist>): Promise<Dentist> {
		this.logger.debug(`update called with id ${id}`);
		LogWriter.append('debug', DentistRepository.name, `update called with id ${id}`);
		const repository = this.dataSource.getRepository(Dentist);
		await repository.update(id, updates);
		const updated = await repository.findOne({ where: { id } });
		if (!updated) {
			throw new Error(`Dentist with id ${id} not found after update`);
		}
		this.logger.log(`Dentist with id ${id} updated`);
		LogWriter.append('log', DentistRepository.name, `Dentist with id ${id} updated`);
		return updated;
	}
}


