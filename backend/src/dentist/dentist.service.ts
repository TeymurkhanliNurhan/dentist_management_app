import { Injectable, Logger } from '@nestjs/common';
import { LogWriter } from '../log-writer';

@Injectable()
export class DentistService {
    private readonly logger = new Logger(DentistService.name);

    // Example hook for future methods
    logProfileAccess(dentistId: number) {
        const msg = `Dentist with id ${dentistId} accessed profile`;
        this.logger.debug(msg);
        LogWriter.append('debug', DentistService.name, msg);
    }
}
