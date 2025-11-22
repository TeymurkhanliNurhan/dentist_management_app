import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentMedicineService } from '../tooth_treatment_medicine.service';

describe('ToothTreatmentMedicineService', () => {
  let service: ToothTreatmentMedicineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToothTreatmentMedicineService],
    }).compile();

    service = module.get<ToothTreatmentMedicineService>(ToothTreatmentMedicineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});


