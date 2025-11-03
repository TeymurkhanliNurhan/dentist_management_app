import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Dentist } from '../dentist/entities/dentist.entity';
import { LogWriter } from '../log-writer';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger(AuthRepository.name);

  private getDentistRepository(): Repository<Dentist> {
    // Ensure connection is initialized
    if (!this.dataSource.isInitialized) {
      throw new Error('Database connection is not initialized');
    }
    return this.dataSource.getRepository(Dentist);
  }

  async findUserByEmail(email: string): Promise<Dentist | null> {
    const repository = this.getDentistRepository();
    const res = await repository.findOne({
      where: { gmail: email },
    });
    this.logger.debug('findUserByEmail executed');
    LogWriter.append('debug', AuthRepository.name, 'findUserByEmail executed');
    return res;
  }

  async createUser(dentist: Partial<Dentist>): Promise<Dentist> {
    const repository = this.getDentistRepository();
    const newDentist = repository.create(dentist);
    const saved = await repository.save(newDentist);
    this.logger.log(`Dentist persisted with id ${saved.id}`);
    LogWriter.append('log', AuthRepository.name, `Dentist persisted with id ${saved.id}`);
    return saved;
  }
}
