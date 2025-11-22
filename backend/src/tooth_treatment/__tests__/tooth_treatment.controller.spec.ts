import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentController } from '../tooth_treatment.controller';

describe('ToothTreatmentController', () => {
  let controller: ToothTreatmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToothTreatmentController],
    }).compile();

    controller = module.get<ToothTreatmentController>(ToothTreatmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

