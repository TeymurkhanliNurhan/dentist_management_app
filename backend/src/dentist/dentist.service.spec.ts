import { Test, TestingModule } from '@nestjs/testing';
import { DentistService } from './dentist.service';

describe('DentistService', () => {
  let service: DentistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DentistService],
    }).compile();

    service = module.get<DentistService>(DentistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
