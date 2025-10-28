import { Module } from '@nestjs/common';
import { PatientToothController } from './patient_tooth.controller';
import { PatientToothService } from './patient_tooth.service';

@Module({
  controllers: [PatientToothController],
  providers: [PatientToothService]
})
export class PatientToothModule {}
