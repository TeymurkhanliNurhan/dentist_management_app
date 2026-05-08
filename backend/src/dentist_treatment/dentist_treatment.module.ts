import { Module } from '@nestjs/common';
import { DentistTreatmentController } from './dentist_treatment.controller';
import { DentistTreatmentService } from './dentist_treatment.service';
import { DentistTreatmentRepository } from './dentist_treatment.repository';

@Module({
  controllers: [DentistTreatmentController],
  providers: [DentistTreatmentService, DentistTreatmentRepository],
})
export class DentistTreatmentModule {}
