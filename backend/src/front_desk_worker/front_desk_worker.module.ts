import { Module } from '@nestjs/common';
import { FrontDeskWorkerController } from './front_desk_worker.controller';
import { FrontDeskWorkerService } from './front_desk_worker.service';
import { FrontDeskWorkerRepository } from './front_desk_worker.repository';

@Module({
  controllers: [FrontDeskWorkerController],
  providers: [FrontDeskWorkerService, FrontDeskWorkerRepository],
})
export class FrontDeskWorkerModule {}
