import { Module } from '@nestjs/common';
import { DirectorController } from './director.controller';
import { DirectorService } from './director.service';
import { DirectorRepository } from './director.repository';

@Module({
  controllers: [DirectorController],
  providers: [DirectorService, DirectorRepository],
})
export class DirectorModule {}
