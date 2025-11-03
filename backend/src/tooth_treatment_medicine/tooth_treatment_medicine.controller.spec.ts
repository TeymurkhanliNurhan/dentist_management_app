import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentMedicineController } from './tooth_treatment_medicine.controller';

describe('ToothTreatmentMedicineController', () => {
  let controller: ToothTreatmentMedicineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToothTreatmentMedicineController],
    }).compile();

    controller = module.get<ToothTreatmentMedicineController>(ToothTreatmentMedicineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

