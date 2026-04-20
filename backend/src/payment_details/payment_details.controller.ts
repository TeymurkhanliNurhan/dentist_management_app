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
import { PaymentDetailsService } from './payment_details.service';
import { CreatePaymentDetailsDto } from './dto/create-payment-details.dto';
import { GetPaymentDetailsDto } from './dto/get-payment-details.dto';
import { UpdatePaymentDetailsDto } from './dto/update-payment-details.dto';

@ApiTags('payment_details')
@Controller('payment-details')
export class PaymentDetailsController {
  constructor(private readonly service: PaymentDetailsService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment details with optional filters' })
  @ApiOkResponse({ description: 'Payment details retrieved' })
  async findAll(
    @User() user: any,
    @Query() queryDto: GetPaymentDetailsDto,
    @Body() bodyDto?: GetPaymentDetailsDto,
  ) {
    const filters = { ...queryDto, ...(bodyDto ?? {}) };
    return await this.service.findAll(user.userId, user.role, filters);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment details' })
  @ApiResponse({ status: 201, description: 'Payment details created' })
  async create(@User() user: any, @Body() dto: CreatePaymentDetailsDto) {
    return await this.service.create(user.userId, user.role, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update payment details by id' })
  @ApiOkResponse({ description: 'Payment details updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDetailsDto,
  ) {
    return await this.service.patch(user.userId, user.role, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete payment details by id' })
  @ApiOkResponse({ description: 'Payment details deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return await this.service.delete(user.userId, user.role, id);
  }
}
