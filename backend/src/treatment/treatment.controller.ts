import {
  Body,
  Controller,
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
import { TreatmentService } from './treatment.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { GetTreatmentDto } from './dto/get-treatment.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { isDirectorRole } from '../auth/role-guards';
import {
  assertPatientMutationForbidden,
  requireStaffContext,
  resolveAuthContext,
} from '../auth/patient-access';

@ApiTags('treatment')
@Controller('treatment')
export class TreatmentController {
  constructor(private readonly service: TreatmentService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get treatments with optional filters' })
  @ApiOkResponse({ description: 'Treatments retrieved' })
  async findAll(@User() user: any, @Query() dto: GetTreatmentDto) {
    const context = resolveAuthContext(user);
    if (context.kind === 'patient') {
      return await this.service.findAllForPatient(context, dto);
    }
    return await this.service.findAll(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create treatment' })
  @ApiResponse({ status: 201, description: 'Treatment created' })
  async create(@User() user: any, @Body() dto: CreateTreatmentDto) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for treatments',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.create(context.dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update treatment by id' })
  @ApiOkResponse({ description: 'Treatment updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreatmentDto,
  ) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for treatments',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.patch(context.dentistId, id, dto);
  }
}
