import { Test, TestingModule } from '@nestjs/testing';
import { PatientToothController } from '../patient_tooth.controller';

describe('PatientToothController', () => {
  let controller: PatientToothController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientToothController],
    }).compile();

    controller = module.get<PatientToothController>(PatientToothController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

