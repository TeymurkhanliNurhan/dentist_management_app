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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RandevueService } from './randevue.service';
import { GetRandevueQueryDto } from './dto/get-randevue-query.dto';
import { CreateRandevueDto } from './dto/create-randevue.dto';
import { UpdateRandevueDto } from './dto/update-randevue.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import {
  assertPatientMutationForbidden,
  assertPatientOwnsPatientId,
  requireStaffContext,
  resolveAuthContext,
} from '../auth/patient-access';

@ApiTags('randevue')
@Controller('randevue')
export class RandevueController {
  constructor(private readonly service: RandevueService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List randevues overlapping a time range for the logged-in dentist or patient',
  })
  @ApiOkResponse({ description: 'Randevues retrieved' })
  async findAll(@User() user: any, @Query() dto: GetRandevueQueryDto) {
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
  @Get('clinic-occupancy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List clinic schedule occupancy for patients (no patient-identifying details)',
  })
  @ApiOkResponse({ description: 'Clinic occupancy retrieved' })
  async findClinicOccupancy(
    @User() user: any,
    @Query() dto: GetRandevueQueryDto,
  ) {
    const context = resolveAuthContext(user);
    if (context.kind !== 'patient') {
      throw new ForbiddenException('Patients only');
    }
    return await this.service.findClinicOccupancyForPatient(context, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a randevue' })
  @ApiCreatedResponse({ description: 'Randevue created' })
  async create(@User() user: any, @Body() dto: CreateRandevueDto) {
    const context = resolveAuthContext(user);
    if (context.kind === 'patient') {
      return await this.service.createForPatient(context, dto);
    }
    const staff = requireStaffContext(context);
    const role =
      typeof staff.role === 'string' ? staff.role.toLowerCase() : undefined;
    return await this.service.create(staff.dentistId, dto, role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a randevue' })
  @ApiOkResponse({ description: 'Randevue updated' })
  async update(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRandevueDto,
  ) {
    assertPatientMutationForbidden(user?.role);
    const context = requireStaffContext(resolveAuthContext(user));
    const role =
      typeof context.role === 'string' ? context.role.toLowerCase() : undefined;
    return await this.service.update(context.dentistId, id, dto, role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a randevue' })
  @ApiOkResponse({ description: 'Randevue deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    assertPatientMutationForbidden(user?.role);
    const context = requireStaffContext(resolveAuthContext(user));
    const role =
      typeof context.role === 'string' ? context.role.toLowerCase() : undefined;
    return await this.service.delete(context.dentistId, id, role);
  }
}
