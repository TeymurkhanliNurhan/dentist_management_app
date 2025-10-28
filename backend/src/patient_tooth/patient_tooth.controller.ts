import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('patient_tooth')
@Controller('patient-tooth')
export class PatientToothController {}
