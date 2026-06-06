import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { ClinicService } from './clinic.service';
import { UpdateClinicWhatsappDto } from './dto/update-clinic-whatsapp.dto';
import { ClinicWhatsappResponseDto } from './dto/clinic-whatsapp-response.dto';

@ApiTags('clinic')
@Controller('clinic')
export class ClinicController {
  constructor(private readonly service: ClinicService) {}

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('whatsapp-integration')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get WhatsApp integration settings for the director clinic',
  })
  @ApiOkResponse({ type: ClinicWhatsappResponseDto })
  async getWhatsappIntegration(
    @User() user: any,
  ): Promise<ClinicWhatsappResponseDto> {
    return await this.service.getWhatsappIntegration(user.staffId, user.role);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch('whatsapp-integration')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update WhatsApp integration settings for the director clinic',
  })
  @ApiOkResponse({ type: ClinicWhatsappResponseDto })
  async patchWhatsappIntegration(
    @User() user: any,
    @Body() dto: UpdateClinicWhatsappDto,
  ): Promise<ClinicWhatsappResponseDto> {
    return await this.service.patchWhatsappIntegration(
      user.staffId,
      user.role,
      dto,
    );
  }
}
