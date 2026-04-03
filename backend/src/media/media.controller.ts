import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { GetMediaDto } from './dto/get-media.dto';

@ApiTags('media')
@Controller('media')
export class MediaController {
    constructor(private readonly service: MediaService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get medias with optional filters' })
    @ApiOkResponse({ description: 'Medias retrieved' })
    async findAll(@Query() dto: GetMediaDto) {
        return await this.service.findAll(dto);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get media by id' })
    @ApiOkResponse({ description: 'Media retrieved' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.service.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create media' })
    @ApiResponse({ status: 201, description: 'Media created' })
    async create(@Body() dto: CreateMediaDto) {
        return await this.service.create(dto);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update media by id' })
    @ApiOkResponse({ description: 'Media updated' })
    async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMediaDto) {
        return await this.service.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete media by id' })
    @ApiOkResponse({ description: 'Media deleted' })
    async delete(@Param('id', ParseIntPipe) id: number) {
        return await this.service.delete(id);
    }
}