import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('appointment')
@Controller('appointment')
export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created' })
  async create(@User() user: any, @Body() dto: CreateAppointmentDto) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
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
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.patch(dentistId, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete appointment by id' })
  @ApiOkResponse({ description: 'Appointment deleted' })
  async delete(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
    return await this.service.delete(dentistId, id);
  }
}
