import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentMedicineService } from '../tooth_treatment_medicine.service';
import { ToothTreatmentMedicineRepository } from '../tooth_treatment_medicine.repository';

describe('ToothTreatmentMedicineService', () => {
  let service: ToothTreatmentMedicineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToothTreatmentMedicineService,
        {
          provide: ToothTreatmentMedicineRepository,
          useValue: {
            createForDentist: jest.fn(),
            deleteEnsureOwnership: jest.fn(),
            findToothTreatmentMedicinesForDentist: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToothTreatmentMedicineService>(
      ToothTreatmentMedicineService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
