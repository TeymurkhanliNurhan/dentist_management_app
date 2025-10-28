import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('dentist')
@Controller('dentist')
export class DentistController {}
