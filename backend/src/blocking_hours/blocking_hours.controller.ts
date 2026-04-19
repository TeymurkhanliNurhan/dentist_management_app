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
import { BlockingHoursService } from './blocking_hours.service';
import { GetBlockingHoursDto } from './dto/get-blocking-hours.dto';
import { CreateBlockingHoursDto } from './dto/create-blocking-hours.dto';
import { UpdateBlockingHoursDto } from './dto/update-blocking-hours.dto';

@ApiTags('blocking_hours')
@Controller('blocking-hours')
export class BlockingHoursController {
  constructor(private readonly service: BlockingHoursService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get blocking hours with optional filters' })
  @ApiOkResponse({ description: 'Blocking hours retrieved' })
  async findAll(@User() user: any, @Query() dto: GetBlockingHoursDto) {
    return await this.service.findAll(user.userId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create blocking hours' })
  @ApiResponse({ status: 201, description: 'Blocking hours created' })
  async create(@User() user: any, @Body() dto: CreateBlockingHoursDto) {
    return await this.service.create(user.userId, dto, user);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update blocking hours by id' })
  @ApiOkResponse({ description: 'Blocking hours updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBlockingHoursDto,
  ) {
    return await this.service.patch(user.userId, id, dto, user);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete blocking hours by id' })
  @ApiOkResponse({ description: 'Blocking hours deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return await this.service.delete(user.userId, id, user);
  }
}
