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
  UnauthorizedException,
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

function resolveDentistContextId(user: any): number {
  const raw = user?.userId ?? user?.sub ?? user?.dentistId;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

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
    const dentistId = resolveDentistContextId(user);
    if (!dentistId) {
      throw new UnauthorizedException('Invalid dentist context');
    }
    const role =
      typeof user?.role === 'string' ? user.role.toLowerCase() : undefined;
    return await this.service.findAll(dentistId, dto, role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  async create(@User() user: any, @Body() dto: CreateAppointmentDto) {
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for appointment creation',
      );
    }
    const dentistId = resolveDentistContextId(user);
    if (!dentistId) {
      throw new UnauthorizedException('Invalid dentist context');
    }
    return await this.service.create(dentistId, dto);
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
    const dentistId = resolveDentistContextId(user);
    if (!dentistId) {
      throw new UnauthorizedException('Invalid dentist context');
    }
    return await this.service.patch(dentistId, id, dto, user?.role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete appointment by id' })
  @ApiOkResponse({ description: 'Appointment deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for appointment deletion',
      );
    }
    const dentistId = resolveDentistContextId(user);
    if (!dentistId) {
      throw new UnauthorizedException('Invalid dentist context');
    }
    return await this.service.delete(dentistId, id);
  }
}
