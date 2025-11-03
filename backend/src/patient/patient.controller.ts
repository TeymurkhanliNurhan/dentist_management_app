import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('patient')
@Controller('patient')
export class PatientController {
    constructor(private readonly patientService: PatientService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create patient' })
    @ApiResponse({ status: 201, description: 'Patient created' })
    async create(@User() user: any, @Body() dto: CreatePatientDto) {
        return await this.patientService.create(user.userId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update patient by id' })
    @ApiResponse({ status: 200, description: 'Patient updated' })
    async patch(
        @User() user: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePatientDto,
    ) {
        return await this.patientService.patch(user.userId, id, dto);
    }
}
