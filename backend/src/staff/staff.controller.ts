import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { GetStaffDto } from './dto/get-staff.dto';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}

  private getDentistId(user: unknown): number {
    if (!user || typeof user !== 'object') {
      throw new Error('Invalid user payload');
    }

    const payload = user as Record<string, unknown>;
    const candidate = payload.userId ?? payload.sub ?? payload.dentistId;
    if (typeof candidate !== 'number') {
      throw new Error('Invalid user id');
    }

    return candidate;
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get staff with optional filters' })
  @ApiOkResponse({ description: 'Staff list retrieved' })
  async findAll(@User() user: unknown, @Query() dto: GetStaffDto) {
    const dentistId = this.getDentistId(user);
    return await this.service.findAll(dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create staff' })
  @ApiResponse({ status: 201, description: 'Staff created' })
  async create(@User() user: unknown, @Body() dto: CreateStaffDto) {
    const dentistId = this.getDentistId(user);
    return await this.service.create(dentistId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update staff by id' })
  @ApiOkResponse({ description: 'Staff updated' })
  async patch(
    @User() user: unknown,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    const dentistId = this.getDentistId(user);
    return await this.service.update(dentistId, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete staff by id' })
  @ApiOkResponse({ description: 'Staff deleted' })
  async delete(@User() user: unknown, @Param('id', ParseIntPipe) id: number) {
    const dentistId = this.getDentistId(user);
    return await this.service.delete(dentistId, id);
  }
}
