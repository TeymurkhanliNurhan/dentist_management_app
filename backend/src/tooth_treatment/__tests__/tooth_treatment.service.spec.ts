import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentService } from '../tooth_treatment.service';

describe('ToothTreatmentService', () => {
  let service: ToothTreatmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToothTreatmentService],
    }).compile();

    service = module.get<ToothTreatmentService>(ToothTreatmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

