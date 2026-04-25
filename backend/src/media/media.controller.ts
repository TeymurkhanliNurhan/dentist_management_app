import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { GetMediaDto } from './dto/get-media.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { isDirectorRole } from '../auth/role-guards';

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

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('media'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'X-ray image' },
        description: {
          type: 'string',
          example: 'Description of the media',
          nullable: true,
        },
        tooth_treatment_id: { type: 'integer', example: 1 },
        media: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Create media with file upload' })
  @ApiResponse({ status: 201, description: 'Media created' })
  async create(
    @Body() dto: CreateMediaDto,
    @UploadedFile() file: Express.Multer.File,
    @User() user: any,
  ) {
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for media',
      );
    }
    return await this.service.create(dto, file, user);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update media by id' })
  @ApiOkResponse({ description: 'Media updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMediaDto,
    @User() user: any,
  ) {
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for media',
      );
    }
    return await this.service.update(id, dto, user);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete media by id' })
  @ApiOkResponse({ description: 'Media deleted' })
  async delete(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    if (isDirectorRole(user?.role)) {
      throw new ForbiddenException(
        'Directors have read-only access for media',
      );
    }
    return await this.service.delete(id, user);
  }
}
