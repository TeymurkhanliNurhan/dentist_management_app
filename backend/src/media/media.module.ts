import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaRepository } from './media.repository';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [S3Module],
    controllers: [MediaController],
    providers: [MediaService, MediaRepository]
})
export class MediaModule {}