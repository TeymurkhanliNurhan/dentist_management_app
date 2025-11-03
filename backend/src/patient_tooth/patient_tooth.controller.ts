import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientToothService } from './patient_tooth.service';
import { GetPatientToothDto } from './dto/get-patient_tooth.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('patient_tooth')
@Controller('patient-tooth')
export class PatientToothController {
    constructor(private readonly patientToothService: PatientToothService) {}

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get patient teeth with optional tooth filter (Dentist only)' })
    @ApiOkResponse({ description: 'Patient teeth retrieved' })
    async findAll(@User() user: any, @Query() dto: GetPatientToothDto) {
        return await this.patientToothService.findAll(user.userId, dto);
    }
}
