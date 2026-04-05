import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RandevueService } from './randevue.service';
import { GetRandevueQueryDto } from './dto/get-randevue-query.dto';
import { CreateRandevueDto } from './dto/create-randevue.dto';
import { UpdateRandevueDto } from './dto/update-randevue.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('randevue')
@Controller('randevue')
export class RandevueController {
    constructor(private readonly service: RandevueService) {}

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'List randevues overlapping a time range for the logged-in dentist' })
    @ApiOkResponse({ description: 'Randevues retrieved' })
    async findAll(@User() user: any, @Query() dto: GetRandevueQueryDto) {
        const raw = user?.userId ?? user?.sub ?? user?.dentistId;
        const dentistId = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
        return await this.service.findAll(dentistId, dto);
    }

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a randevue' })
    @ApiCreatedResponse({ description: 'Randevue created' })
    async create(@User() user: any, @Body() dto: CreateRandevueDto) {
        const raw = user?.userId ?? user?.sub ?? user?.dentistId;
        const dentistId = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
        return await this.service.create(dentistId, dto);
    }

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update a randevue' })
    @ApiOkResponse({ description: 'Randevue updated' })
    async update(@User() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRandevueDto) {
        const raw = user?.userId ?? user?.sub ?? user?.dentistId;
        const dentistId = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
        return await this.service.update(dentistId, id, dto);
    }
}
