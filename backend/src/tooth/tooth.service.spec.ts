import { Test, TestingModule } from '@nestjs/testing';
import { ToothService } from './tooth.service';

describe('ToothService', () => {
  let service: ToothService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToothService],
    }).compile();

    service = module.get<ToothService>(ToothService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
