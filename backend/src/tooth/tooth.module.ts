import { Module } from '@nestjs/common';
import { ToothController } from './tooth.controller';
import { ToothService } from './tooth.service';
import { ToothRepository } from './tooth.repository';

@Module({
  controllers: [ToothController],
  providers: [ToothService, ToothRepository]
})
export class ToothModule {}
