import { Test, TestingModule } from '@nestjs/testing';
import { PatientToothService } from '../patient_tooth.service';

describe('PatientToothService', () => {
  let service: PatientToothService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientToothService],
    }).compile();

    service = module.get<PatientToothService>(PatientToothService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

