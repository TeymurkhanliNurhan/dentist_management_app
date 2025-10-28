import { Test, TestingModule } from '@nestjs/testing';
import { ToothController } from './tooth.controller';

describe('ToothController', () => {
  let controller: ToothController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToothController],
    }).compile();

    controller = module.get<ToothController>(ToothController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
