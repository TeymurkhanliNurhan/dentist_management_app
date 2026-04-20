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
import { SalaryService } from './salary.service';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { GetSalaryDto } from './dto/get-salary.dto';

@ApiTags('salary')
@Controller('salary')
export class SalaryController {
  constructor(private readonly service: SalaryService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get salaries with optional filters' })
  @ApiOkResponse({ description: 'Salaries retrieved' })
  async findAll(
    @User() user: any,
    @Query() queryDto: GetSalaryDto,
    @Body() bodyDto?: GetSalaryDto,
  ) {
    const filters = { ...queryDto, ...(bodyDto ?? {}) };
    return await this.service.findAll(user.userId, user.role, filters);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create salary' })
  @ApiResponse({ status: 201, description: 'Salary created' })
  async create(@User() user: any, @Body() dto: CreateSalaryDto) {
    return await this.service.create(user.userId, user.role, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':staffId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update salary by staff id' })
  @ApiOkResponse({ description: 'Salary updated' })
  async patch(
    @User() user: any,
    @Param('staffId', ParseIntPipe) staffId: number,
    @Body() dto: UpdateSalaryDto,
  ) {
    return await this.service.patch(user.userId, user.role, staffId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':staffId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete salary by staff id' })
  @ApiOkResponse({ description: 'Salary deleted' })
  async delete(@User() user: any, @Param('staffId', ParseIntPipe) staffId: number) {
    return await this.service.delete(user.userId, user.role, staffId);
  }
}
