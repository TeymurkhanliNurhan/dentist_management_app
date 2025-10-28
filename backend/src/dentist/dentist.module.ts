import { Module } from '@nestjs/common';
import { DentistController } from './dentist.controller';
import { DentistService } from './dentist.service';
import { DentistRepository } from './dentist.repository';

@Module({
  controllers: [DentistController],
  providers: [DentistService, DentistRepository]
})
export class DentistModule {}
