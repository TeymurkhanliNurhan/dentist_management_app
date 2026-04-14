import { Module } from '@nestjs/common';
import { BlockingHoursController } from './blocking_hours.controller';
import { BlockingHoursService } from './blocking_hours.service';
import { BlockingHoursRepository } from './blocking_hours.repository';

@Module({
  controllers: [BlockingHoursController],
  providers: [BlockingHoursService, BlockingHoursRepository],
})
export class BlockingHoursModule {}
