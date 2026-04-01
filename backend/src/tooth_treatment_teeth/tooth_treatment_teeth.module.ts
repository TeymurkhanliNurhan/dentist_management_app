import { Module } from '@nestjs/common';
import { ToothTreatmentTeethController } from './tooth_treatment_teeth.controller';
import { ToothTreatmentTeethService } from './tooth_treatment_teeth.service';
import { ToothTreatmentTeethRepository } from './tooth_treatment_teeth.repository';

@Module({
    controllers: [ToothTreatmentTeethController],
    providers: [ToothTreatmentTeethService, ToothTreatmentTeethRepository],
})
export class ToothTreatmentTeethModule {}
