import { Module } from '@nestjs/common';
import { ToothTreatmentMedicineController } from './tooth_treatment_medicine.controller';
import { ToothTreatmentMedicineService } from './tooth_treatment_medicine.service';
import { ToothTreatmentMedicineRepository } from './tooth_treatment_medicine.repository';

@Module({
  controllers: [ToothTreatmentMedicineController],
  providers: [ToothTreatmentMedicineService, ToothTreatmentMedicineRepository]
})
export class ToothTreatmentMedicineModule {}

