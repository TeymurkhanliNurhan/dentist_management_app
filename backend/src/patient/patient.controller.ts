import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('patient')
@Controller('patient')
export class PatientController {
    constructor(private readonly patientService: PatientService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create patient' })
    @ApiResponse({ status: 201, description: 'Patient created' })
    async create(@Body() dto: CreatePatientDto) {
        return await this.patientService.create(dto);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update patient by id' })
    @ApiResponse({ status: 200, description: 'Patient updated' })
    async patch(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePatientDto,
    ) {
        return await this.patientService.patch(id, dto);
    }
}
