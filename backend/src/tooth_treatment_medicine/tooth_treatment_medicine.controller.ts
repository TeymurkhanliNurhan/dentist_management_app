import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToothTreatmentMedicineService } from './tooth_treatment_medicine.service';
import { CreateToothTreatmentMedicineDto } from './dto/create-tooth_treatment_medicine.dto';
import { GetToothTreatmentMedicineDto } from './dto/get-tooth_treatment_medicine.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('tooth-treatment-medicine')
@Controller('tooth-treatment-medicine')
export class ToothTreatmentMedicineController {
  constructor(private readonly service: ToothTreatmentMedicineService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get tooth treatment medicines with optional filters' })
  @ApiOkResponse({ description: 'Tooth treatment medicines retrieved' })
  async findAll(@User() user: any, @Query() dto: GetToothTreatmentMedicineDto) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.findAll(dentistId, dto);
  }

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

