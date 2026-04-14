import {
  Delete,
  Controller,
  Get,
  Param,
  Logger,
  ParseIntPipe,
  Patch,
  Query,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DentistService } from './dentist.service';
import { LogWriter } from '../log-writer';
import { UpdateDentistDto } from './dto/update-dentist.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { CreateDentistDto } from './dto/create-dentist.dto';
import { GetDentistDto } from './dto/get-dentist.dto';

@ApiTags('dentist')
@Controller('dentist')
export class DentistController {
  private readonly logger = new Logger(DentistController.name);

  constructor(private readonly dentistService: DentistService) {
    const msg = 'DentistController initialized';
    this.logger.debug(msg);
    LogWriter.append('debug', DentistController.name, msg);
  }

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

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dentists with optional filters' })
  @ApiBearerAuth('bearer')
  findAll(@User() user: unknown, @Query() dto: GetDentistDto) {
    const requesterDentistId = this.getDentistId(user);
    return this.dentistService.findAll(requesterDentistId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dentist by ID' })
  @ApiBearerAuth('bearer')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dentistService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create dentist' })
  @ApiBearerAuth('bearer')
  create(@User() user: unknown, @Body() createDentistDto: CreateDentistDto) {
    const requesterDentistId = this.getDentistId(user);
    return this.dentistService.create(requesterDentistId, createDentistDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update dentist details' })
  @ApiBearerAuth('bearer')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDentistDto: UpdateDentistDto,
  ) {
    return this.dentistService.update(id, updateDentistDto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update dentist password' })
  @ApiBearerAuth('bearer')
  updatePassword(
    @User() user: unknown,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const dentistId = this.getDentistId(user);
    return this.dentistService.updatePassword(dentistId, updatePasswordDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete dentist by id' })
  @ApiBearerAuth('bearer')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.dentistService.delete(id);
  }
}
