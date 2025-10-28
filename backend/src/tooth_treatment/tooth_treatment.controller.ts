import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('tooth_treatment')
@Controller('tooth-treatment')
export class ToothTreatmentController {}
