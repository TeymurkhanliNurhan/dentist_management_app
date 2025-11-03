import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private getDentistRepository(): Repository<Dentist> {
    // Ensure connection is initialized
    if (!this.dataSource.isInitialized) {
      throw new Error('Database connection is not initialized');
    }
    return this.dataSource.getRepository(Dentist);
  }

  async findUserByEmail(email: string): Promise<Dentist | null> {
    const repository = this.getDentistRepository();
    return await repository.findOne({
      where: { gmail: email },
    });
  }

  async createUser(dentist: Partial<Dentist>): Promise<Dentist> {
    const repository = this.getDentistRepository();
    const newDentist = repository.create(dentist);
    return await repository.save(newDentist);
  }
}
