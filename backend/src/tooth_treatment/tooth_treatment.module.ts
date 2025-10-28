import { Module } from '@nestjs/common';
import { ToothTreatmentController } from './tooth_treatment.controller';
import { ToothTreatmentService } from './tooth_treatment.service';

@Module({
  controllers: [ToothTreatmentController],
  providers: [ToothTreatmentService]
})
export class ToothTreatmentModule {}
