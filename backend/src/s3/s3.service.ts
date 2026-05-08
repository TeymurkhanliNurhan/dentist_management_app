import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigService } from '@nestjs/config';
import { LogWriter } from '../log-writer';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION')!,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
    });
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME')!;
    if (!this.bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    try {
      this.logger.debug(
        `Uploading file ${file.originalname} to S3 with key ${key}`,
      );
      LogWriter.append(
        'debug',
        S3Service.name,
        `Uploading file ${file.originalname} to S3 with key ${key}`,
      );

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          // ACL removed - use bucket policy for public access instead
        },
      });

      const result = await upload.done();
      const url = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;

      this.logger.log(`File uploaded successfully: ${url}`);
      LogWriter.append(
        'log',
        S3Service.name,
        `File uploaded successfully: ${url}`,
      );

      return url;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      LogWriter.append(
        'error',
        S3Service.name,
        `Failed to upload file: ${error.message}`,
      );
      if (error.name) {
        this.logger.error(`Error name: ${error.name}`);
        LogWriter.append('error', S3Service.name, `Error name: ${error.name}`);
      }
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
        LogWriter.append('error', S3Service.name, `Error code: ${error.code}`);
      }
      throw error;
    }
  }

  generateKey(file: Express.Multer.File): string {
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop();
    return `media/${timestamp}-${Math.random().toString(36).substring(2)}.${extension}`;
  }
}
