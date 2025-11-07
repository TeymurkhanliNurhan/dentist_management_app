import { Controller, Get, Param, Logger, ParseIntPipe, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DentistService } from './dentist.service';
import { LogWriter } from '../log-writer';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

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

    @Patch()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update dentist details' })
    @ApiBearerAuth('bearer')
    update(@Request() req: any, @Body() updateDentistDto: UpdateDentistDto) {
        const dentistId = req.user.userId;
        return this.dentistService.update(dentistId, updateDentistDto);
    }

    @Patch('password')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update dentist password' })
    @ApiBearerAuth('bearer')
    updatePassword(@Request() req: any, @Body() updatePasswordDto: UpdatePasswordDto) {
        const dentistId = req.user.userId;
        return this.dentistService.updatePassword(dentistId, updatePasswordDto);
    }
}
