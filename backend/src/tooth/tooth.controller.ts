import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('tooth')
@Controller('tooth')
export class ToothController {}
