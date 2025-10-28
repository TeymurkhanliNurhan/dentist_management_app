import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('appointment')
@Controller('appointment')
export class AppointmentController {}
