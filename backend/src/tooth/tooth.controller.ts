import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ToothService } from './tooth.service';
import { GetToothDto } from './dto/get-tooth.dto';

@ApiTags('tooth')
@Controller('tooth')
export class ToothController {
    constructor(private readonly toothService: ToothService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get teeth with optional filters and language-specific names' })
    @ApiOkResponse({ description: 'Teeth retrieved with translations' })
    async findAll(@Query() dto: GetToothDto) {
        return await this.toothService.findAll(dto);
    }
}
