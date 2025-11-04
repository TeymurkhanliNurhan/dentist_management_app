import { Controller, Get, Param, Logger, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DentistService } from './dentist.service';
import { LogWriter } from '../log-writer';

@ApiTags('dentist')
@Controller('dentist')
export class DentistController {
    private readonly logger = new Logger(DentistController.name);

    constructor(private readonly dentistService: DentistService) {
        const msg = 'DentistController initialized';
        this.logger.debug(msg);
        LogWriter.append('debug', DentistController.name, msg);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get dentist by ID' })
    @ApiBearerAuth('bearer')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.dentistService.findOne(id);
    }
}
