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
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { GetAppointmentDto } from './dto/get-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { isDirectorRole } from '../auth/role-guards';
import {
  assertPatientMutationForbidden,
  assertPatientOwnsPatientId,
  requireStaffContext,
  resolveAuthContext,
} from '../auth/patient-access';

@ApiTags('appointment')
@Controller('appointment')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get appointments with optional filters' })
  @ApiOkResponse({ description: 'Appointments retrieved' })
  async findAll(@User() user: any, @Query() dto: GetAppointmentDto) {
    const context = resolveAuthContext(user);
    if (context.kind === 'patient') {
      assertPatientOwnsPatientId(context, dto.patient);
      return await this.service.findAllForPatient(context, dto);
    }
    const role =
      typeof context.role === 'string' ? context.role.toLowerCase() : undefined;
    return await this.service.findAll(context.dentistId, dto, role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  async create(@User() user: any, @Body() dto: CreateAppointmentDto) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for appointment creation',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.create(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update appointment by id' })
  @ApiOkResponse({ description: 'Appointment updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
  ) {
    assertPatientMutationForbidden(user?.role);
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
  @ApiOperation({ summary: 'Delete appointment by id' })
  @ApiOkResponse({ description: 'Appointment deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for appointment deletion',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.delete(context.dentistId, id);
  }
}
