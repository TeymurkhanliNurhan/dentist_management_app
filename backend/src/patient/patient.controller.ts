import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('patient')
@Controller('patient')
export class PatientController {}
