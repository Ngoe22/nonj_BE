import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  ALLOWED_MIME_TYPES,
  DEFAULT_FOLDER_BY_FILE_TYPE,
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRES,
  STORAGE_FOLDER,
  type StorageFolder,
} from './storage.constant.js';

interface PresignedUploadInput {
  fileName: string;
  contentType: string;
  /** Bỏ trống thì suy ra từ `fileType` */
  folder?: StorageFolder | string;
  fileType: 'image' | 'audio';
}

export interface PresignedUploadOutput {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
  maxSize: number;
}

@Injectable()
export class R2Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('r2.bucketName');
    this.publicUrlBase = this.config.getOrThrow<string>('r2.publicUrl');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.config.getOrThrow<string>('r2.endpoint'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('r2.accessKeyId'),
        secretAccessKey: this.config.getOrThrow<string>('r2.secretAccessKey'),
      },
    });
  }

  // ============================================================
  // PRESIGNED UPLOAD
  // ============================================================
  async getPresignedUploadUrl(
    input: PresignedUploadInput,
  ): Promise<PresignedUploadOutput> {
    const { fileName, contentType, folder, fileType } = input;

    // 1. Validate MIME type
    const allowed = ALLOWED_MIME_TYPES[fileType] as readonly string[];
    if (!allowed.includes(contentType)) {
      throw new BadRequestException({
        errorCode: 'invalid_file_type',
        allowed,
      });
    }

    // 1b. Thư mục — client có thể bỏ trống, mặc định theo loại file
    const resolvedFolder = (folder ??
      DEFAULT_FOLDER_BY_FILE_TYPE[fileType]) as StorageFolder;
    if (!Object.values(STORAGE_FOLDER).includes(resolvedFolder)) {
      throw new BadRequestException({ errorCode: 'invalid_folder' });
    }

    // 2. Tạo key duy nhất — tránh ghi đè
    const ext =
      extname(fileName).toLowerCase() || this.getExtFromMime(contentType);
    const key = `${resolvedFolder}/${randomUUID()}${ext}`;

    // 3. Tạo presigned URL
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES,
    });

    // 4. Build response
    const expiresAt = new Date(
      Date.now() + PRESIGNED_URL_EXPIRES * 1000,
    ).toISOString();

    return {
      uploadUrl,
      publicUrl: `${this.publicUrlBase}/${key}`,
      key,
      expiresAt,
      maxSize: MAX_FILE_SIZE[fileType],
    };
  }

  // ============================================================
  // DELETE
  // ============================================================
  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys.length) return;

    await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
    };
    return map[mime] ?? '';
  }
}
