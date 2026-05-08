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
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { GetExpenseDto } from './dto/get-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@ApiTags('expense')
@Controller('expense')
export class ExpenseController {
  constructor(private readonly service: ExpenseService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get expenses with optional filters' })
  @ApiOkResponse({ description: 'Expenses retrieved' })
  async findAll(
    @User() user: any,
    @Query() queryDto: GetExpenseDto,
    @Body() bodyDto?: GetExpenseDto,
  ) {
    const filters = { ...queryDto, ...(bodyDto ?? {}) };
    return await this.service.findAll(user.userId, user.role, filters);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create expense' })
  @ApiResponse({ status: 201, description: 'Expense created' })
  async create(@User() user: any, @Body() dto: CreateExpenseDto) {
    return await this.service.create(user.userId, user.role, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update expense by id' })
  @ApiOkResponse({ description: 'Expense updated' })
  async patch(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
  ) {
    return await this.service.patch(user.userId, user.role, id, dto);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete expense by id' })
  @ApiOkResponse({ description: 'Expense deleted' })
  async delete(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return await this.service.delete(user.userId, user.role, id);
  }
}
