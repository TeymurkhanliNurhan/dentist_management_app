import {
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MediaRepository } from './media.repository';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { GetMediaDto } from './dto/get-media.dto';
import { S3Service } from '../s3/s3.service';
import { LogWriter } from '../log-writer';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly repo: MediaRepository,
    private readonly s3Service: S3Service,
  ) {}

  private contextDentistId(user: any): number {
    const raw = user?.userId ?? user?.sub ?? user?.dentistId;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      throw new UnauthorizedException();
    }
    return n;
  }

  async findAll(dto: GetMediaDto) {
    const result = await this.repo.findAll(dto);
    this.logger.log(`Retrieved ${result.medias.length} medias`);
    LogWriter.append(
      'log',
      MediaService.name,
      `Retrieved ${result.medias.length} medias`,
    );
    return result;
  }

  async findOne(id: number) {
    const media = await this.repo.findById(id);
    if (!media) {
      this.logger.warn(`Media with id ${id} not found`);
      LogWriter.append(
        'warn',
        MediaService.name,
        `Media with id ${id} not found`,
      );
      throw new NotFoundException(`Media with id ${id} not found`);
    }
    this.logger.log(`Media with id ${id} retrieved`);
    LogWriter.append('log', MediaService.name, `Media with id ${id} retrieved`);
    return media;
  }

  async create(
    dto: CreateMediaDto,
    file: Express.Multer.File,
    user: any,
  ) {
    try {
      const dentistId = this.contextDentistId(user);
      await this.repo.assertUserMayMutateToothTreatment({
        contextDentistId: dentistId,
        userRole: user?.role,
        toothTreatmentId: dto.tooth_treatment_id,
      });
      // Upload file to S3
      const key = this.s3Service.generateKey(file);
      const photoUrl = await this.s3Service.uploadFile(file, key);

      const created = await this.repo.create({
        photo_url: photoUrl,
        name: dto.name,
        description: dto.description,
        tooth_treatment_id: dto.tooth_treatment_id,
      });
      this.logger.log(`Media created with id ${created.id}`);
      LogWriter.append(
        'log',
        MediaService.name,
        `Media created with id ${created.id}`,
      );
      return created;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden')) {
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      if (e?.message?.includes('Tooth Treatment not found'))
        throw new NotFoundException('Tooth Treatment not found');
      throw e;
    }
  }

  async update(id: number, dto: UpdateMediaDto, user: any) {
    try {
      const dentistId = this.contextDentistId(user);
      const existing = await this.repo.findById(id);
      if (!existing?.toothTreatment?.id) {
        throw new NotFoundException('Media not found');
      }
      await this.repo.assertUserMayMutateToothTreatment({
        contextDentistId: dentistId,
        userRole: user?.role,
        toothTreatmentId: existing.toothTreatment.id,
      });
      if (
        dto.tooth_treatment_id != null &&
        dto.tooth_treatment_id !== existing.toothTreatment.id
      ) {
        await this.repo.assertUserMayMutateToothTreatment({
          contextDentistId: dentistId,
          userRole: user?.role,
          toothTreatmentId: dto.tooth_treatment_id,
        });
      }
      const updated = await this.repo.update(id, dto);
      this.logger.log(`Media with id ${id} updated`);
      LogWriter.append('log', MediaService.name, `Media with id ${id} updated`);
      return updated;
    } catch (e: any) {
      if (e?.message?.includes('Forbidden')) {
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      if (e?.message?.includes('Media not found'))
        throw new NotFoundException('Media not found');
      if (e?.message?.includes('Tooth Treatment not found'))
        throw new NotFoundException('Tooth Treatment not found');
      throw e;
    }
  }

  async delete(id: number, user: any) {
    try {
      const dentistId = this.contextDentistId(user);
      const existing = await this.repo.findById(id);
      if (!existing?.toothTreatment?.id) {
        throw new NotFoundException('Media not found');
      }
      await this.repo.assertUserMayMutateToothTreatment({
        contextDentistId: dentistId,
        userRole: user?.role,
        toothTreatmentId: existing.toothTreatment.id,
      });
      await this.repo.delete(id);
      this.logger.log(`Media with id ${id} deleted`);
      LogWriter.append('log', MediaService.name, `Media with id ${id} deleted`);
      return { message: 'Media deleted successfully' };
    } catch (e: any) {
      if (e?.message?.includes('Forbidden')) {
        throw new BadRequestException("You don't have such a tooth treatment");
      }
      if (e?.message?.includes('Media not found'))
        throw new NotFoundException('Media not found');
      throw e;
    }
  }
}
