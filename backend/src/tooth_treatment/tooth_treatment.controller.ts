import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { ToothTreatmentService } from './tooth_treatment.service';
import { CreateToothTreatmentDto } from './dto/create-tooth_treatment.dto';
import { UpdateToothTreatmentDto } from './dto/update-tooth_treatment.dto';
import { GetToothTreatmentDto } from './dto/get-tooth_treatment.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { isDirectorRole } from '../auth/role-guards';
import {
  assertPatientMutationForbidden,
  assertPatientOwnsPatientId,
  assertPatientOwnsToothTreatment,
  requireStaffContext,
  resolveAuthContext,
} from '../auth/patient-access';

@ApiTags('tooth_treatment')
@Controller('tooth-treatment')
export class ToothTreatmentController {
  constructor(private readonly service: ToothTreatmentService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get tooth treatments with optional filters' })
  @ApiOkResponse({ description: 'Tooth treatments retrieved with full info' })
  async findAll(@User() user: any, @Query() dto: GetToothTreatmentDto) {
    const context = resolveAuthContext(user);
    if (context.kind === 'patient') {
      assertPatientOwnsPatientId(context, dto.patient);
      await assertPatientOwnsToothTreatment(
        context,
        dto.id,
        (patientId, clinicId, toothTreatmentId) =>
          this.service.patientOwnsToothTreatment(
            patientId,
            clinicId,
            toothTreatmentId,
          ),
      );
      return await this.service.findAllForPatient(context, dto);
    }
    return await this.service.findAll(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create tooth treatment' })
  @ApiResponse({ status: 201, description: 'Tooth treatment created' })
  async create(@User() user: any, @Body() dto: CreateToothTreatmentDto) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for tooth treatments',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.create(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tooth treatment by id' })
  @ApiOkResponse({ description: 'Tooth treatment updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateToothTreatmentDto,
  ) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for tooth treatments',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.patch(
      context.dentistId,
      id,
      dto,
      context.role,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete tooth treatment by id' })
  @ApiOkResponse({ description: 'Tooth treatment deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for tooth treatments',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.delete(context.dentistId, id, context.role);
  }
}
