import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { GetPatientDto } from './dto/get-patient.dto';
import { PatientUpdateResponseDto } from './dto/patient-update-response.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import {
  assertPatientMutationForbidden,
  assertPatientOwnsPatientId,
  requireStaffContext,
  resolveAuthContext,
} from '../auth/patient-access';

@ApiTags('patient')
@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get patients with optional filters' })
  @ApiOkResponse({
    description: 'Patients retrieved',
    type: [PatientUpdateResponseDto],
  })
  async findAll(@User() user: any, @Query() dto: GetPatientDto) {
    const context = resolveAuthContext(user);
    if (context.kind === 'patient') {
      assertPatientOwnsPatientId(context, dto.id);
      return await this.patientService.findAllForPatient(context, dto);
    }
    return await this.patientService.findAll(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create patient' })
  @ApiResponse({ status: 201, description: 'Patient created' })
  async create(@User() user: any, @Body() dto: CreatePatientDto) {
    assertPatientMutationForbidden(user?.role);
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.patientService.create(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update patient by id' })
  @ApiOkResponse({ description: 'Patient updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    assertPatientMutationForbidden(user?.role);
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.patientService.patch(context.dentistId, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete patient by id' })
  @ApiOkResponse({ description: 'Patient deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    assertPatientMutationForbidden(user?.role);
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.patientService.delete(context.dentistId, id);
  }
}
