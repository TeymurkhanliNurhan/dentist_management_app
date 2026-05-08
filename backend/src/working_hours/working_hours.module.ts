import { Module } from '@nestjs/common';
import { WorkingHoursController } from './working_hours.controller';
import { WorkingHoursService } from './working_hours.service';
import { WorkingHoursRepository } from './working_hours.repository';

@Module({
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService, WorkingHoursRepository],
})
export class WorkingHoursModule {}
