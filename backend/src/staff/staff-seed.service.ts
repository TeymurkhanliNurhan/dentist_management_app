import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';
import { Clinic } from '../clinic/entities/clinic.entity';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaffSeedService.name);
  private readonly bakuAddresses = [
    'Nizami Street 45, Baku',
    'Tbilisi Avenue 112, Baku',
    '28 May Street 19, Baku',
    'Neftchilar Avenue 78, Baku',
    'Azadliq Avenue 233, Baku',
    'Jafar Jabbarli Street 34, Baku',
  ];

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedFromDentists();
  }

  private async seedFromDentists(): Promise<void> {
    const dentistRepository = this.dataSource.getRepository(Dentist);
    const clinicRepository = this.dataSource.getRepository(Clinic);
    const staffRepository = this.dataSource.getRepository(Staff);

    const dentists = await dentistRepository.find();
    if (!dentists.length) {
      return;
    }

    for (const dentist of dentists) {
      const existingStaff = await staffRepository.findOne({
        where: { gmail: dentist.gmail },
      });

      if (existingStaff) {
        continue;
      }

      const clinic = clinicRepository.create({
        name: `${dentist.name}'s clinic`,
        address: this.getRandomBakuAddress(),
      });
      const savedClinic = await clinicRepository.save(clinic);

      const staff = staffRepository.create({
        name: dentist.name,
        surname: dentist.surname,
        birthDate: dentist.birthDate,
        gmail: dentist.gmail,
        password: dentist.password,
        active: true,
        startDate: new Date(),
        endDate: null,
        clinicId: savedClinic.id,
      });

      await staffRepository.save(staff);
    }

    this.logger.log('Clinic and staff seed completed for existing dentists');
  }

  private getRandomBakuAddress(): string {
    const index = Math.floor(Math.random() * this.bakuAddresses.length);
    return this.bakuAddresses[index];
  }
}
