import { Injectable, Logger } from '@nestjs/common';
import { LogWriter } from '../logs/log-writer';

@Injectable()
export class DentistRepository {
	private readonly logger = new Logger(DentistRepository.name);

	findAll() {
		this.logger.debug('findAll called');
		LogWriter.append('debug', DentistRepository.name, 'findAll called');
		return [];
	}
}


