import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientDto } from './dto/get-patient.dto';
import { PatientUpdateResponseDto } from './dto/patient-update-response.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('patient')
@Controller('patient')
@UseGuards(JwtAuthGuard, SubscriptionGuard) // Protect all patient routes with subscription guard
export class PatientController {
    constructor(private readonly patientService: PatientService) {}

    @ApiBearerAuth('bearer')
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get patients with optional filters' })
    @ApiOkResponse({ description: 'Patients retrieved', type: [PatientUpdateResponseDto] })
    async findAll(@User() user: any, @Query() dto: GetPatientDto) {
        console.log('[PatientController] findAll() user:', user, 'filters:', dto);
        return await this.patientService.findAll(user.userId, dto);
    }

    @ApiBearerAuth('bearer')
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create patient' })
    @ApiResponse({ status: 201, description: 'Patient created' })
    async create(@User() user: any, @Body() dto: CreatePatientDto) {
        console.log('[PatientController] create() user:', user);
        return await this.patientService.create(user.userId, dto);
    }

    @ApiBearerAuth('bearer')
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update patient by id' })
    @ApiOkResponse({ description: 'Patient updated' })
    async patch(
        @User() user: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePatientDto,
    ) {
        console.log('[PatientController] patch() user:', user, 'id:', id);
        return await this.patientService.patch(user.userId, id, dto);
    }
}
