import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientToothService } from './patient_tooth.service';
import { GetPatientToothDto } from './dto/get-patient_tooth.dto';

@ApiTags('patient_tooth')
@Controller('patient-tooth')
export class PatientToothController {
    constructor(private readonly patientToothService: PatientToothService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get patient teeth with optional tooth filter' })
    @ApiOkResponse({ description: 'Patient teeth retrieved' })
    async findAll(@Query() dto: GetPatientToothDto) {
        return await this.patientToothService.findAll(dto);
    }
}
