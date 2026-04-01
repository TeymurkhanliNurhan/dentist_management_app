import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ToothTreatmentTeethService } from './tooth_treatment_teeth.service';
import { CreateToothTreatmentTeethDto } from './dto/create-tooth_treatment_teeth.dto';
import { GetToothTreatmentTeethDto } from './dto/get-tooth_treatment_teeth.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('tooth_treatment_teeth')
@Controller('tooth-treatment-teeth')
export class ToothTreatmentTeethController {
    private readonly logger = new Logger(ToothTreatmentTeethController.name);

    constructor(private readonly service: ToothTreatmentTeethService) {}

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get tooth treatment teeth with optional filters' })
    @ApiOkResponse({ description: 'Tooth treatment teeth retrieved' })
    async findAll(@User() user: any, @Query() dto: GetToothTreatmentTeethDto) {
        const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
        this.logger.log(`findAll called for dentistId=${dentistId}, filters=${JSON.stringify(dto)}`);
        const result = await this.service.findAll(dentistId, dto);
        this.logger.log(`findAll result count=${result.length}`);
        return result;
    }

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Get(':id/teeth')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all teeth linked to a tooth treatment' })
    @ApiOkResponse({ description: 'Teeth retrieved' })
    async getTeethForTreatment(@User() user: any, @Param('id', ParseIntPipe) toothTreatmentId: number) {
        const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
        return await this.service.getTeethForTreatment(dentistId, toothTreatmentId);
    }

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add teeth to a tooth treatment' })
    @ApiResponse({ status: 201, description: 'Teeth added successfully' })
    async addTeeth(@User() user: any, @Body() dto: CreateToothTreatmentTeethDto) {
        const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
        return await this.service.addTeeth(dentistId, dto);
    }

    @ApiBearerAuth('bearer')
    @UseGuards(JwtAuthGuard)
    @Delete(':id/teeth')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove all teeth from a tooth treatment' })
    @ApiOkResponse({ description: 'Teeth removed successfully' })
    async removeTeeth(
        @User() user: any,
        @Param('id', ParseIntPipe) toothTreatmentId: number,
        @Query('tooth_ids') toothIds: string,
    ) {
        const dentistId = user?.userId ?? user?.sub ?? user?.dentistId;
        const ids = toothIds.split(',').map((id) => parseInt(id, 10));
        return await this.service.removeTeeth(dentistId, toothTreatmentId, ids);
    }
}
