import { Module } from '@nestjs/common';
import { DentistController } from './dentist.controller';
import { DentistService } from './dentist.service';

@Module({
  controllers: [DentistController],
  providers: [DentistService]
})
export class DentistModule {}
