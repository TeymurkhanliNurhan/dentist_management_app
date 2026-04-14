import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { DentistTreatmentService } from './dentist_treatment.service';
import { CreateDentistTreatmentDto } from './dto/create-dentist_treatment.dto';
import { DeleteDentistTreatmentDto } from './dto/delete-dentist_treatment.dto';
import { GetDentistTreatmentDto } from './dto/get-dentist_treatment.dto';

@ApiTags('dentist_treatment')
@Controller('dentist-treatment')
export class DentistTreatmentController {
  constructor(private readonly service: DentistTreatmentService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a dentist-treatment link' })
  @ApiResponse({ status: 201, description: 'Link created successfully' })
  async create(@Body() dto: CreateDentistTreatmentDto) {
    return await this.service.create(dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a dentist-treatment link' })
  @ApiOkResponse({ description: 'Link deleted successfully' })
  async remove(@Query() dto: DeleteDentistTreatmentDto) {
    return await this.service.remove(dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dentist-treatment links with optional filters',
  })
  @ApiOkResponse({ description: 'Links retrieved successfully' })
  async findAll(@Query() dto: GetDentistTreatmentDto) {
    return await this.service.findAll(dto);
  }
}
