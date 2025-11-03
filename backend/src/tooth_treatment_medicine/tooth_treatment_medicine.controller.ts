import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToothTreatmentMedicineService } from './tooth_treatment_medicine.service';
import { CreateToothTreatmentMedicineDto } from './dto/create-tooth_treatment_medicine.dto';
import { UpdateToothTreatmentMedicineDto } from './dto/update-tooth_treatment_medicine.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('tooth-treatment-medicine')
@Controller('tooth-treatment-medicine')
export class ToothTreatmentMedicineController {
  constructor(private readonly service: ToothTreatmentMedicineService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create tooth treatment medicine' })
  @ApiResponse({ status: 201, description: 'Tooth treatment medicine created' })
  async create(@User() user: any, @Body() dto: CreateToothTreatmentMedicineDto) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.create(dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':tooth_treatment_id/:medicine_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tooth treatment medicine (change medicine)' })
  @ApiOkResponse({ description: 'Tooth treatment medicine updated' })
  async patch(
    @User() user: any,
    @Param('tooth_treatment_id', ParseIntPipe) toothTreatmentId: number,
    @Param('medicine_id', ParseIntPipe) oldMedicineId: number,
    @Body() dto: UpdateToothTreatmentMedicineDto,
  ) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.patch(dentistId, toothTreatmentId, oldMedicineId, dto);
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
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.delete(dentistId, toothTreatmentId, medicineId);
  }
}

