import { Module } from '@nestjs/common';
import { ToothTreatmentController } from './tooth_treatment.controller';
import { ToothTreatmentService } from './tooth_treatment.service';
import { ToothTreatmentRepository } from './tooth_treatment.repository';

@Module({
  controllers: [ToothTreatmentController],
  providers: [ToothTreatmentService, ToothTreatmentRepository]
})
export class ToothTreatmentModule {}
