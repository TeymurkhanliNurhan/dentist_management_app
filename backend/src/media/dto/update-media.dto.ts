import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class UpdateMediaDto {
  @ApiPropertyOptional({
    example: 'https://s3.amazonaws.com/bucket/media.jpg',
    description: 'Photo URL from S3',
  })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiPropertyOptional({ example: 'Updated X-ray image' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Tooth Treatment ID' })
  @IsOptional()
  @IsInt()
  tooth_treatment_id?: number;
}
