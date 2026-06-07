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
import { ToothTreatmentMedicineService } from './tooth_treatment_medicine.service';
import { CreateToothTreatmentMedicineDto } from './dto/create-tooth_treatment_medicine.dto';
import { GetToothTreatmentMedicineDto } from './dto/get-tooth_treatment_medicine.dto';
import { UpdateToothTreatmentMedicineDto } from './dto/update-tooth_treatment_medicine.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { isDirectorRole } from '../auth/role-guards';
import {
  assertPatientMutationForbidden,
  assertPatientOwnsToothTreatment,
  requireStaffContext,
  resolveAuthContext,
} from '../auth/patient-access';

@ApiTags('tooth-treatment-medicine')
@Controller('tooth-treatment-medicine')
export class ToothTreatmentMedicineController {
  constructor(private readonly service: ToothTreatmentMedicineService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tooth treatment medicines with optional filters',
  })
  @ApiOkResponse({ description: 'Tooth treatment medicines retrieved' })
  async findAll(@User() user: any, @Query() dto: GetToothTreatmentMedicineDto) {
    const context = resolveAuthContext(user);
    if (context.kind === 'patient') {
      await assertPatientOwnsToothTreatment(
        context,
        dto.tooth_treatment,
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
  @ApiOperation({ summary: 'Create tooth treatment medicine' })
  @ApiResponse({ status: 201, description: 'Tooth treatment medicine created' })
  async create(
    @User() user: any,
    @Body() dto: CreateToothTreatmentMedicineDto,
  ) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for tooth treatment medicines',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.create(context.dentistId, dto, context.role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':tooth_treatment_id/:medicine_id/quantity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update quantity for a tooth treatment medicine' })
  @ApiOkResponse({ description: 'Tooth treatment medicine quantity updated' })
  async updateQuantity(
    @User() user: any,
    @Param('tooth_treatment_id', ParseIntPipe) toothTreatmentId: number,
    @Param('medicine_id', ParseIntPipe) medicineId: number,
    @Body() dto: UpdateToothTreatmentMedicineDto,
  ) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for tooth treatment medicines',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.updateQuantity(
      context.dentistId,
      toothTreatmentId,
      medicineId,
      dto,
      context.role,
    );
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':tooth_treatment_id/:medicine_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete tooth treatment medicine' })
  @ApiOkResponse({ description: 'Tooth treatment medicine deleted' })
  async delete(
    @User() user: any,
    @Param('tooth_treatment_id', ParseIntPipe) toothTreatmentId: number,
    @Param('medicine_id', ParseIntPipe) medicineId: number,
  ) {
    assertPatientMutationForbidden(user?.role);
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for tooth treatment medicines',
      );
    }
    const context = requireStaffContext(resolveAuthContext(user));
    return await this.service.delete(
      context.dentistId,
      toothTreatmentId,
      medicineId,
      context.role,
    );
  }
}
