import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaffSeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.attachDentistsToStaff();
  }

  private async attachDentistsToStaff(): Promise<void> {
    const dentistRepository = this.dataSource.getRepository(Dentist);
    const staffRepository = this.dataSource.getRepository(Staff);

    const dentists = await dentistRepository.find();
    if (!dentists.length) {
      return;
    }

    for (const dentist of dentists) {
      if (dentist.staffId) {
        continue;
      }

      const staffBySameId = await staffRepository.findOne({ where: { id: dentist.id } });
      if (staffBySameId) {
        await dentistRepository.update(dentist.id, { staffId: staffBySameId.id });
      }
    }

    this.logger.log('Dentist to staff mapping sync completed');
  }
}
