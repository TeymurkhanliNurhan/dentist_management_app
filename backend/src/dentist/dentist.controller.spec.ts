import { Test, TestingModule } from '@nestjs/testing';
import { DentistController } from './dentist.controller';

describe('DentistController', () => {
  let controller: DentistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DentistController],
    }).compile();

    controller = module.get<DentistController>(DentistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
