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
import { PurchaseMedicineService } from './purchase_medicine.service';
import { CreatePurchaseMedicineDto } from './dto/create-purchase-medicine.dto';
import { GetPurchaseMedicineDto } from './dto/get-purchase-medicine.dto';
import { UpdatePurchaseMedicineDto } from './dto/update-purchase-medicine.dto';
import { CreatePurchaseSessionDto } from './dto/create-purchase-session.dto';

@ApiTags('purchase_medicine')
@Controller('purchase-medicine')
export class PurchaseMedicineController {
  constructor(private readonly service: PurchaseMedicineService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get purchase medicines with optional filters' })
  @ApiOkResponse({ description: 'Purchase medicines retrieved' })
  async findAll(
    @User() user: any,
    @Query() queryDto: GetPurchaseMedicineDto,
    @Body() bodyDto?: GetPurchaseMedicineDto,
  ) {
    const filters = { ...queryDto, ...(bodyDto ?? {}) };
    return await this.service.findAll(user.userId, user.role, filters);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create purchase medicine' })
  @ApiResponse({ status: 201, description: 'Purchase medicine created' })
  async create(@User() user: any, @Body() dto: CreatePurchaseMedicineDto) {
    return await this.service.create(user.userId, user.role, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create purchase session for multiple medicines' })
  @ApiResponse({ status: 201, description: 'Purchase session created' })
  async createSession(@User() user: any, @Body() dto: CreatePurchaseSessionDto) {
    return await this.service.createSession(user.userId, user.role, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update purchase medicine by id' })
  @ApiOkResponse({ description: 'Purchase medicine updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseMedicineDto,
  ) {
    return await this.service.patch(user.userId, user.role, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete purchase medicine by id' })
  @ApiOkResponse({ description: 'Purchase medicine deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return await this.service.delete(user.userId, user.role, id);
  }
}
