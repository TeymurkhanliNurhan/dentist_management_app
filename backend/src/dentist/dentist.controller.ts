import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LogWriter } from '../log-writer';

@ApiTags('dentist')
@Controller('dentist')
export class DentistController {
    private readonly logger = new Logger(DentistController.name);

    constructor() {
        const msg = 'DentistController initialized';
        this.logger.debug(msg);
        LogWriter.append('debug', DentistController.name, msg);
    }
}
