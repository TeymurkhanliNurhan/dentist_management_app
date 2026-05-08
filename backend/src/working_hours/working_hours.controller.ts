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
import { WorkingHoursService } from './working_hours.service';
import { GetWorkingHoursDto } from './dto/get-working-hours.dto';
import { CreateWorkingHoursDto } from './dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from './dto/update-working-hours.dto';

@ApiTags('working_hours')
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly service: WorkingHoursService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get working hours with optional filters' })
  @ApiOkResponse({ description: 'Working hours retrieved' })
  async findAll(@User() user: any, @Query() dto: GetWorkingHoursDto) {
    return await this.service.findAll(user, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create working hours' })
  @ApiResponse({ status: 201, description: 'Working hours created' })
  async create(@User() user: any, @Body() dto: CreateWorkingHoursDto) {
    return await this.service.create(user.userId, user.role, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update working hours by id' })
  @ApiOkResponse({ description: 'Working hours updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return await this.service.patch(user.userId, user.role, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete working hours by id' })
  @ApiOkResponse({ description: 'Working hours deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return await this.service.delete(user.userId, user.role, id);
  }
}
