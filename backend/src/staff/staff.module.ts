import { Module } from '@nestjs/common';
import { StaffSeedService } from './staff-seed.service';

@Module({
  providers: [StaffSeedService],
})
export class StaffModule {}
