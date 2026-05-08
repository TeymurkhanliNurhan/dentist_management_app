import { Module } from '@nestjs/common';
import { NurseController } from './nurse.controller';
import { NurseService } from './nurse.service';
import { NurseRepository } from './nurse.repository';

@Module({
  controllers: [NurseController],
  providers: [NurseService, NurseRepository],
})
export class NurseModule {}
