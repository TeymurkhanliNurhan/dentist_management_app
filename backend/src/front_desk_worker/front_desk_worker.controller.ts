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
import { FrontDeskWorkerService } from './front_desk_worker.service';
import { GetFrontDeskWorkerDto } from './dto/get-front-desk-worker.dto';
import { CreateFrontDeskWorkerDto } from './dto/create-front-desk-worker.dto';
import { UpdateFrontDeskWorkerDto } from './dto/update-front-desk-worker.dto';

@ApiTags('front_desk_worker')
@Controller('front-desk-worker')
export class FrontDeskWorkerController {
  constructor(private readonly service: FrontDeskWorkerService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get front desk workers with optional filters' })
  @ApiOkResponse({ description: 'Front desk workers retrieved' })
  async findAll(@User() user: any, @Query() dto: GetFrontDeskWorkerDto) {
    return await this.service.findAll(user.userId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create front desk worker' })
  @ApiResponse({ status: 201, description: 'Front desk worker created' })
  async create(@User() user: any, @Body() dto: CreateFrontDeskWorkerDto) {
    return await this.service.create(user.userId, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update front desk worker by id' })
  @ApiOkResponse({ description: 'Front desk worker updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFrontDeskWorkerDto,
  ) {
    return await this.service.patch(user.userId, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete front desk worker by id' })
  @ApiOkResponse({ description: 'Front desk worker deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return await this.service.delete(user.userId, id);
  }
}
