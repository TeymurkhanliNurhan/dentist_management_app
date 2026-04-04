import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentMedicineController } from '../tooth_treatment_medicine.controller';
import { ToothTreatmentMedicineService } from '../tooth_treatment_medicine.service';

describe('ToothTreatmentMedicineController', () => {
  let controller: ToothTreatmentMedicineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToothTreatmentMedicineController],
      providers: [
        {
          provide: ToothTreatmentMedicineService,
          useValue: {
            create: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ToothTreatmentMedicineController>(ToothTreatmentMedicineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


