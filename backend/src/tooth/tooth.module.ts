import { Module } from '@nestjs/common';
import { ToothController } from './tooth.controller';
import { ToothService } from './tooth.service';

@Module({
  controllers: [ToothController],
  providers: [ToothService]
})
export class ToothModule {}
