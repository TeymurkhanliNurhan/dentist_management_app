import { Controller, Post, Get, UseInterceptors, UploadedFiles, Body, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('contact')
@ApiBearerAuth('bearer')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get contact information' })
  async getContactInfo(): Promise<{ email: string; phone: string }> {
    return this.contactService.getContactInfo();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Send contact form with attachments' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        header: { type: 'string' },
        context: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  async sendContact(
    @Body() contactDto: ContactDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ message: string }> {
    return this.contactService.sendContactEmail(contactDto, files);
  }
}

