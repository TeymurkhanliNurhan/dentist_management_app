import { Test, TestingModule } from '@nestjs/testing';
import { ToothTreatmentController } from '../tooth_treatment.controller';
import { ToothTreatmentService } from '../tooth_treatment.service';

describe('ToothTreatmentController', () => {
  let controller: ToothTreatmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToothTreatmentController],
      providers: [
        {
          provide: ToothTreatmentService,
          useValue: {
            create: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ToothTreatmentController>(ToothTreatmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
