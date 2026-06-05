import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientRepository } from './patient.repository';

@Module({
  controllers: [PatientController],
  providers: [PatientService, PatientRepository],
  exports: [PatientRepository],
})
export class PatientModule {}
