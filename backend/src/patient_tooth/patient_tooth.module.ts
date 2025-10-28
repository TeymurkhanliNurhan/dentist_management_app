import { Module } from '@nestjs/common';
import { PatientToothController } from './patient_tooth.controller';
import { PatientToothService } from './patient_tooth.service';
import { PatientToothRepository } from './patient_tooth.repository';

@Module({
  controllers: [PatientToothController],
  providers: [PatientToothService, PatientToothRepository]
})
export class PatientToothModule {}
