import { Module } from '@nestjs/common';
import { StaffSeedService } from './staff-seed.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';

@Module({
  controllers: [StaffController],
  providers: [StaffSeedService, StaffService, StaffRepository],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
