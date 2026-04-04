import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentService } from '../tooth_treatment.service';
import { ToothTreatmentRepository } from '../tooth_treatment.repository';

describe('ToothTreatmentService', () => {
  let service: ToothTreatmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToothTreatmentService,
        {
          provide: ToothTreatmentRepository,
          useValue: {
            createForDentist: jest.fn(),
            updateEnsureOwnership: jest.fn(),
            deleteEnsureOwnership: jest.fn(),
            findToothTreatmentsForDentist: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ToothTreatmentService>(ToothTreatmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
