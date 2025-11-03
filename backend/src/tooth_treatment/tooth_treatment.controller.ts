import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToothTreatmentService } from './tooth_treatment.service';
import { CreateToothTreatmentDto } from './dto/create-tooth_treatment.dto';
import { UpdateToothTreatmentDto } from './dto/update-tooth_treatment.dto';
import { GetToothTreatmentDto } from './dto/get-tooth_treatment.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

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
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.findAll(dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create tooth treatment' })
  @ApiResponse({ status: 201, description: 'Tooth treatment created' })
  async create(@User() user: any, @Body() dto: CreateToothTreatmentDto) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.create(dentistId, dto);
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
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.patch(dentistId, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete tooth treatment by id' })
  @ApiOkResponse({ description: 'Tooth treatment deleted' })
  async delete(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.delete(dentistId, id);
  }
}
