import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('treatment')
@Controller('treatment')
export class TreatmentController {}
